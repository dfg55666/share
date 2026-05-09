"""Session & message proxy routes — direct access to NodeOps runtime."""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from backend.services import nodeops_client as noc
from backend.services import account_pool
from backend.storage.file_store import (
    read_md,
)

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


class SendMessageRequest(BaseModel):
    text: str | None = None
    image_url: str | None = None
    image_mime: str | None = None
    no_reply: bool = False
    system: str | None = None
    model: str | None = None


@router.get("/list")
async def list_sessions(account_id: str):
    """List all sessions for an account's deployment."""
    acc = account_pool.get_account(account_id)
    if not acc:
        raise HTTPException(404, "Account not found")
    if not acc.get("runtime_host") or not acc.get("project_token"):
        raise HTTPException(400, "Account has no active deployment")

    data = await noc.list_sessions(
        acc["runtime_host"], acc["project_token"], acc["auth_token"]
    )
    return {"success": True, "data": data}


@router.get("/{session_id}/messages")
async def get_messages(session_id: str, account_id: str):
    """Pull messages for a specific session."""
    acc = account_pool.get_account(account_id)
    if not acc:
        raise HTTPException(404, "Account not found")
    if not acc.get("runtime_host") or not acc.get("project_token"):
        raise HTTPException(400, "Account has no active deployment")

    data = await noc.get_messages(
        acc["runtime_host"], acc["project_token"], acc["auth_token"], session_id
    )
    return {"success": True, "data": data}


@router.post("/{session_id}/message")
async def send_message(session_id: str, account_id: str, req: SendMessageRequest):
    """Send a message to a session."""
    acc = account_pool.get_account(account_id)
    if not acc:
        raise HTTPException(404, "Account not found")
    if not acc.get("runtime_host") or not acc.get("project_token"):
        raise HTTPException(400, "Account has no active deployment")

    if not str(req.text or "").strip() and not str(req.image_url or "").strip():
        raise HTTPException(400, "text or image_url is required")

    data = await noc.send_message(
        acc["runtime_host"], acc["project_token"], acc["auth_token"],
        session_id,
        req.text or "",
        req.no_reply,
        req.system,
        req.model,
        image_url=req.image_url,
        image_mime=req.image_mime,
    )
    return {"success": True, "data": data}


@router.post("/{session_id}/abort")
async def abort_session(session_id: str, account_id: str):
    """Abort current generation in a session."""
    acc = account_pool.get_account(account_id)
    if not acc:
        raise HTTPException(404, "Account not found")
    if not acc.get("runtime_host") or not acc.get("project_token"):
        raise HTTPException(400, "Account has no active deployment")

    data = await noc.abort_session(
        acc["runtime_host"], acc["project_token"], acc["auth_token"], session_id
    )
    return {"success": True, "data": data}


@router.get("/history/{project_name}/{task_id}")
def get_session_history(project_name: str, task_id: str):
    """List all saved session .md files for a task."""
    # Scan .nodeops/{task_id}/ for session files
    from backend.storage.file_store import repo_dir
    nodeops_dir = repo_dir(project_name) / ".nodeops" / task_id
    if not nodeops_dir.exists():
        return {"success": True, "data": []}

    sessions = []
    for account_dir in sorted(nodeops_dir.iterdir()):
        if account_dir.is_dir():
            for md_file in sorted(account_dir.glob("session-*.md")):
                raw = read_md(md_file)
                account_email = _extract_header_value(raw, "Account") or _decode_account_dir_name(account_dir.name)
                session_id = _extract_header_value(raw, "NodeOps Session ID")
                sessions.append({
                    "account_dir": account_dir.name,
                    "account": account_dir.name,
                    "account_email": account_email,
                    "email": account_email,
                    "file": md_file.name,
                    "session_file": md_file.name,
                    "path": str(md_file.relative_to(repo_dir(project_name))),
                    "session_id": session_id,
                })
    return {"success": True, "data": sessions}


@router.get("/history/{project_name}/{task_id}/content")
def get_session_content(project_name: str, task_id: str,
                        account: str = Query(...),
                        session_file: str = Query(...)):
    """Read the content of a session .md file."""
    from backend.storage.file_store import repo_dir
    path = repo_dir(project_name) / ".nodeops" / task_id / account / session_file
    if not path.exists():
        encoded_account = account.replace("@", "_at_").replace("+", "_plus_")
        alt = repo_dir(project_name) / ".nodeops" / task_id / encoded_account / session_file
        if alt.exists():
            path = alt
    if not path.exists():
        raise HTTPException(404, "Session file not found")
    content = read_md(path)
    return {"success": True, "data": {"content": content}}


def _extract_header_value(raw: str, key: str) -> str | None:
    if not raw:
        return None
    prefix = f"- {key}:"
    for line in raw.splitlines()[:30]:
        if line.startswith(prefix):
            value = line[len(prefix):].strip()
            return value or None
    return None


def _decode_account_dir_name(value: str) -> str:
    return str(value or "").replace("_plus_", "+").replace("_at_", "@")
