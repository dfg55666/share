"""
Task engine — the core loop system.

Manages task lifecycle:
  pending → running → monitoring → completed / switching / blocked

Auto mode: credit exhausted → sync workspace → git push → switch account → new session → resend message
Oneshot mode: credit exhausted → blocked
"""
import asyncio
import uuid
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from backend.storage.file_store import (
    task_json, tasks_dir, project_json, read_json, write_json, now_iso,
)
from backend.services import nodeops_client as noc
from backend.services import account_pool
from backend.services import workspace_sync
from backend.services import session_recorder
from backend.services import credit_monitor

logger = logging.getLogger(__name__)

# Active task loops (task_id -> asyncio.Task)
_active_tasks: dict[str, asyncio.Task] = {}

# Message cache for active sessions: task_id -> list of message dicts
_message_cache: dict[str, list[dict]] = {}

# SSE stop events: task_id -> asyncio.Event
_stop_events: dict[str, asyncio.Event] = {}


# ─── Task CRUD ──────────────────────────────────────────────────────

def create_task(project_name: str, mode: str, message: str,
                max_loops: int = 10, task_id: str | None = None) -> dict:
    """Create a new task definition."""
    tid = task_id or f"task-{str(uuid.uuid4())[:8]}"

    # Ensure project exists
    pj = project_json(project_name)
    if not pj.exists():
        raise ValueError(f"Project '{project_name}' does not exist")

    task = {
        "id": tid,
        "project": project_name,
        "mode": mode,
        "status": "pending",
        "message": message,
        "current_account_id": None,
        "current_session_id": None,
        "current_runtime_host": None,
        "current_project_token": None,
        "loop_count": 0,
        "max_loops": max_loops,
        "session_index": 0,
        "used_account_ids": [],
        "loops": [],
        "error": None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }

    path = task_json(project_name, tid)
    path.parent.mkdir(parents=True, exist_ok=True)
    write_json(path, task)
    logger.info(f"Created task {tid} in project {project_name}")
    return task


def get_task(project_name: str, task_id: str) -> dict | None:
    path = task_json(project_name, task_id)
    if not path.exists():
        return None
    return read_json(path)


def update_task(project_name: str, task_id: str, updates: dict) -> dict | None:
    task = get_task(project_name, task_id)
    if not task:
        return None
    task.update(updates)
    task["updated_at"] = now_iso()
    write_json(task_json(project_name, task_id), task)
    return task


def list_tasks(project_name: str) -> list[dict]:
    tdir = tasks_dir(project_name)
    if not tdir.exists():
        return []
    tasks = []
    for f in tdir.glob("*.json"):
        tasks.append(read_json(f))
    return sorted(tasks, key=lambda t: t.get("created_at", ""))


def list_all_tasks() -> list[dict]:
    """List tasks across all projects."""
    from backend.storage.file_store import DATA_DIR
    projects_dir = DATA_DIR / "projects"
    if not projects_dir.exists():
        return []
    all_tasks = []
    for pdir in projects_dir.iterdir():
        if pdir.is_dir():
            all_tasks.extend(list_tasks(pdir.name))
    return all_tasks


def delete_task(project_name: str, task_id: str) -> bool:
    path = task_json(project_name, task_id)
    if path.exists():
        path.unlink()
        return True
    return False


# ─── Task Execution ─────────────────────────────────────────────────

async def start_task(project_name: str, task_id: str):
    """Start the task loop in the background."""
    task = get_task(project_name, task_id)
    if not task:
        raise ValueError(f"Task {task_id} not found")

    if task_id in _active_tasks and not _active_tasks[task_id].done():
        raise ValueError(f"Task {task_id} is already running")

    _stop_events[task_id] = asyncio.Event()
    _message_cache[task_id] = []

    async_task = asyncio.create_task(_task_loop(project_name, task_id))
    _active_tasks[task_id] = async_task
    logger.info(f"Started task loop: {task_id}")


async def cancel_task(project_name: str, task_id: str):
    """Cancel a running task."""
    if task_id in _stop_events:
        _stop_events[task_id].set()

    if task_id in _active_tasks:
        _active_tasks[task_id].cancel()
        del _active_tasks[task_id]

    task = get_task(project_name, task_id)
    if task and task["status"] not in ("completed", "failed", "canceled"):
        # Release account if locked
        if task.get("current_account_id"):
            account_pool.release_account(task["current_account_id"])
        update_task(project_name, task_id, {"status": "canceled"})
    logger.info(f"Canceled task: {task_id}")


def get_task_messages(task_id: str) -> list[dict]:
    """Get cached messages for an active task."""
    return _message_cache.get(task_id, [])


def is_task_running(task_id: str) -> bool:
    return task_id in _active_tasks and not _active_tasks[task_id].done()


# ─── Main Task Loop ─────────────────────────────────────────────────

async def _task_loop(project_name: str, task_id: str):
    """Main loop: acquire account → create session → send message → monitor → handle result."""
    try:
        task = get_task(project_name, task_id)
        update_task(project_name, task_id, {"status": "running"})

        while True:
            task = get_task(project_name, task_id)
            if not task:
                break

            if task["loop_count"] >= task["max_loops"]:
                update_task(project_name, task_id, {
                    "status": "stopped",
                    "error": f"Reached max loops ({task['max_loops']})"
                })
                break

            if _stop_events.get(task_id, asyncio.Event()).is_set():
                break

            # ── Step 1: Acquire account ──
            update_task(project_name, task_id, {"status": "acquiring_account"})
            account = account_pool.acquire_account(
                exclude_ids=task.get("used_account_ids", []),
                task_id=task_id,
            )
            if not account:
                update_task(project_name, task_id, {
                    "status": "blocked_no_account",
                    "error": "No available accounts"
                })
                logger.warning(f"Task {task_id}: no available accounts")
                break

            update_task(project_name, task_id, {
                "current_account_id": account["id"],
            })

            # ── Step 2: Ensure deployment ──
            try:
                deployment_info = await _ensure_deployment(account)
                runtime_host = deployment_info["runtime_host"]
                project_token = deployment_info["project_token"]
                update_task(project_name, task_id, {
                    "current_runtime_host": runtime_host,
                    "current_project_token": project_token,
                })
            except Exception as e:
                logger.error(f"Task {task_id}: deployment failed: {e}")
                account_pool.release_account(account["id"])
                update_task(project_name, task_id, {
                    "status": "failed",
                    "error": f"Deployment failed: {e}"
                })
                break

            # ── Step 3: Create session ──
            try:
                session_data = await noc.create_session(
                    runtime_host, project_token, account["auth_token"],
                    title=f"{task_id} loop-{task['loop_count'] + 1}"
                )
                session_id = session_data.get("id", session_data.get("sessionId", ""))
                task["session_index"] = task.get("session_index", 0) + 1
                update_task(project_name, task_id, {
                    "current_session_id": session_id,
                    "session_index": task["session_index"],
                    "status": "running",
                })
            except Exception as e:
                logger.error(f"Task {task_id}: create session failed: {e}")
                account_pool.release_account(account["id"])
                update_task(project_name, task_id, {
                    "status": "failed",
                    "error": f"Create session failed: {e}"
                })
                break

            # Init session recorder
            session_recorder.init_session_file(
                project_name, task_id, account["email"],
                task["session_index"], session_id
            )

            # ── Step 4: Send message ──
            try:
                await noc.send_message(
                    runtime_host, project_token, account["auth_token"],
                    session_id, task["message"]
                )
                session_recorder.append_message(
                    project_name, task_id, account["email"],
                    task["session_index"], "User", task["message"]
                )
            except Exception as e:
                if credit_monitor.is_credit_error(str(e)):
                    logger.info(f"Task {task_id}: credit exhausted on send")
                    # Handle as credit exhausted
                    end_reason = await _handle_credit_exhausted(
                        project_name, task_id, task, account
                    )
                    if end_reason == "continue":
                        continue
                    break
                else:
                    logger.error(f"Task {task_id}: send message failed: {e}")
                    account_pool.release_account(account["id"])
                    update_task(project_name, task_id, {
                        "status": "failed",
                        "error": f"Send message failed: {e}"
                    })
                    break

            # ── Step 5: Monitor session ──
            end_reason = await _monitor_session(
                project_name, task_id, task, account,
                runtime_host, project_token, session_id
            )

            if end_reason == "completed":
                # Task completed normally
                await _sync_and_push(project_name, task_id, task, account, "completed")
                session_recorder.finalize_session(
                    project_name, task_id, account["email"],
                    task["session_index"], "completed"
                )
                account_pool.release_account(account["id"])
                update_task(project_name, task_id, {"status": "completed"})
                break

            elif end_reason == "credit_exhausted":
                result = await _handle_credit_exhausted(
                    project_name, task_id, task, account
                )
                if result == "continue":
                    continue
                break

            elif end_reason == "error":
                account_pool.release_account(account["id"])
                break

            elif end_reason == "canceled":
                account_pool.release_account(account["id"])
                break

    except asyncio.CancelledError:
        logger.info(f"Task {task_id} was canceled")
        update_task(project_name, task_id, {"status": "canceled"})
    except Exception as e:
        logger.error(f"Task {task_id} unexpected error: {e}", exc_info=True)
        update_task(project_name, task_id, {
            "status": "failed",
            "error": str(e),
        })
    finally:
        _active_tasks.pop(task_id, None)
        _stop_events.pop(task_id, None)


# ─── Helpers ─────────────────────────────────────────────────────────

async def _ensure_deployment(account: dict) -> dict:
    """Make sure an account has an active deployment. Returns {runtime_host, project_token}."""
    auth_token = account["auth_token"]

    # If account already has deployment info, verify it
    if account.get("runtime_host") and account.get("project_token"):
        try:
            await noc.get_health(account["runtime_host"])
            return {
                "runtime_host": account["runtime_host"],
                "project_token": account["project_token"],
            }
        except Exception:
            logger.info(f"Existing deployment unhealthy for {account['email']}, creating new")

    # List existing deployments
    deployments = await noc.list_deployments(auth_token)
    deploy_list = deployments if isinstance(deployments, list) else deployments.get("deployments", [])

    if deploy_list:
        # Use the first active deployment
        dep = deploy_list[0]
        dep_id = dep.get("id", dep.get("deploymentId", ""))
        dep_detail = await noc.get_deployment(auth_token, dep_id)

        runtime_host = dep_detail.get("runtimeHost", dep_detail.get("runtime_host",
                       dep_detail.get("host", dep_detail.get("endpoint", ""))))
        project_token = dep_detail.get("projectToken", dep_detail.get("project_token",
                        dep_detail.get("token", "")))

        if runtime_host and project_token:
            # Cache on account
            account_pool.update_account(account["id"], {
                "deployment_id": dep_id,
                "runtime_host": runtime_host,
                "project_token": project_token,
            })
            return {"runtime_host": runtime_host, "project_token": project_token}

    # Create new deployment
    new_dep = await noc.create_deployment(auth_token)
    dep_id = new_dep.get("id", new_dep.get("deploymentId", ""))
    if not dep_id:
        raise Exception(f"No deployment ID in response: {new_dep}")

    # Poll until deployment is ready
    for _ in range(30):
        dep_detail = await noc.get_deployment(auth_token, dep_id)
        runtime_host = dep_detail.get("runtimeHost", dep_detail.get("runtime_host",
                       dep_detail.get("host", dep_detail.get("endpoint", ""))))
        project_token = dep_detail.get("projectToken", dep_detail.get("project_token",
                        dep_detail.get("token", "")))
        status = dep_detail.get("status", "")

        if runtime_host and project_token:
            account_pool.update_account(account["id"], {
                "deployment_id": dep_id,
                "runtime_host": runtime_host,
                "project_token": project_token,
            })
            return {"runtime_host": runtime_host, "project_token": project_token}

        await asyncio.sleep(5)

    raise Exception("Deployment did not become ready in time")


async def _monitor_session(project_name: str, task_id: str, task: dict,
                           account: dict, runtime_host: str,
                           project_token: str, session_id: str) -> str:
    """Monitor a running session by polling messages.

    Returns: "completed" | "credit_exhausted" | "error" | "canceled"
    """
    auth_token = account["auth_token"]
    idle_count = 0
    last_message_count = 0
    poll_interval = 5  # seconds

    while True:
        if _stop_events.get(task_id, asyncio.Event()).is_set():
            return "canceled"

        try:
            # Pull messages
            messages_data = await noc.get_messages(
                runtime_host, project_token, auth_token, session_id
            )
            messages = messages_data if isinstance(messages_data, list) else \
                       messages_data.get("messages", [])

            # Cache messages
            _message_cache[task_id] = messages

            # Record new messages
            if len(messages) > last_message_count:
                for msg in messages[last_message_count:]:
                    role = msg.get("role", "unknown")
                    content = _extract_message_text(msg)
                    session_recorder.append_message(
                        project_name, task_id, account["email"],
                        task["session_index"], role, content
                    )
                last_message_count = len(messages)
                idle_count = 0
            else:
                idle_count += 1

            # Check if AI is done (no new messages for idle_timeout)
            # idle_timeout = 120s / poll_interval = 24 polls
            if idle_count > 24 and last_message_count > 1:
                # Verify it's not credit exhaustion
                credit_status = await credit_monitor.check_credits(
                    auth_token, account["id"]
                )
                if credit_status["exhausted"]:
                    return "credit_exhausted"
                else:
                    return "completed"

        except Exception as e:
            error_str = str(e)
            if credit_monitor.is_credit_error(error_str):
                return "credit_exhausted"
            logger.error(f"Task {task_id} monitor error: {e}")
            # Transient error — retry a few times
            idle_count += 1
            if idle_count > 10:
                update_task(project_name, task_id, {
                    "status": "failed",
                    "error": f"Monitor failed: {e}"
                })
                return "error"

        # Check credits periodically (every 6 polls = ~30s)
        if idle_count % 6 == 0 and idle_count > 0:
            try:
                credit_status = await credit_monitor.check_credits(
                    auth_token, account["id"]
                )
                if credit_status["exhausted"]:
                    return "credit_exhausted"
            except Exception:
                pass

        await asyncio.sleep(poll_interval)


async def _handle_credit_exhausted(project_name: str, task_id: str,
                                   task: dict, account: dict) -> str:
    """Handle credit exhaustion.

    Auto mode: sync → push → switch account → return "continue"
    Oneshot mode: block → return "blocked"
    """
    session_recorder.finalize_session(
        project_name, task_id, account["email"],
        task.get("session_index", 0), "credit_exhausted"
    )

    if task["mode"] == "oneshot":
        account_pool.release_account(account["id"], exhausted=True)
        update_task(project_name, task_id, {
            "status": "blocked",
            "error": "Credit exhausted (oneshot mode)"
        })
        return "blocked"

    # Auto mode: sync and continue
    await _sync_and_push(project_name, task_id, task, account, "credit_exhausted")

    # Release and mark account exhausted
    used_ids = task.get("used_account_ids", [])
    if account["id"] not in used_ids:
        used_ids.append(account["id"])
    account_pool.release_account(account["id"], exhausted=True)

    # Record loop
    loops = task.get("loops", [])
    loops.append({
        "index": task["loop_count"] + 1,
        "account_email": account["email"],
        "session_id": task.get("current_session_id"),
        "started_at": task.get("updated_at"),
        "ended_at": now_iso(),
        "end_reason": "credit_exhausted",
    })

    update_task(project_name, task_id, {
        "loop_count": task["loop_count"] + 1,
        "used_account_ids": used_ids,
        "loops": loops,
        "status": "switching",
        "current_account_id": None,
        "current_session_id": None,
    })

    logger.info(f"Task {task_id}: switching to next account (loop {task['loop_count'] + 1})")
    return "continue"


async def _sync_and_push(project_name: str, task_id: str,
                         task: dict, account: dict, reason: str):
    """Download workspace and git push."""
    runtime_host = task.get("current_runtime_host", account.get("runtime_host"))
    project_token = task.get("current_project_token", account.get("project_token"))
    auth_token = account["auth_token"]

    if not runtime_host or not project_token:
        logger.warning(f"Task {task_id}: no runtime info, skip workspace sync")
        return

    update_task(project_name, task_id, {"status": "syncing"})

    try:
        await workspace_sync.sync_workspace_to_repo(
            runtime_host, project_token, auth_token, project_name
        )
    except Exception as e:
        logger.error(f"Task {task_id}: workspace sync failed: {e}")

    update_task(project_name, task_id, {"status": "pushing"})

    try:
        commit = await workspace_sync.git_push(
            project_name,
            f"Loop {task['loop_count'] + 1} - {reason}"
        )
        if commit:
            logger.info(f"Task {task_id}: pushed commit {commit}")
    except Exception as e:
        logger.error(f"Task {task_id}: git push failed: {e}")


def _extract_message_text(msg: dict) -> str:
    """Extract readable text from a message object."""
    # Messages may have 'content' as string or 'parts' as list
    if isinstance(msg.get("content"), str):
        return msg["content"]

    parts = msg.get("parts", msg.get("content", []))
    if isinstance(parts, list):
        texts = []
        for part in parts:
            if isinstance(part, dict) and part.get("type") == "text":
                texts.append(part.get("text", ""))
            elif isinstance(part, str):
                texts.append(part)
        return "\n".join(texts)

    return str(msg.get("content", msg.get("text", "")))
