"""Session & message proxy routes — direct access to NodeOps runtime."""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from backend.services import nodeops_client as noc
from backend.services import account_pool
from backend.storage.file_store import (
    session_md_path, read_md, DATA_DIR,
)

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


class SendMessageRequest(BaseModel):
    text: str
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

    data = await noc.send_message(
        acc["runtime_host"], acc["project_token"], acc["auth_token"],
        session_id, req.text, req.no_reply, req.system, req.model
    )
    return {"success": True, "data": data}


@router.post("/{session_id}/abort")
async def abort_session(session_id: str, account_id: str):
    """Abort current generation in a session."""
    acc = account_pool.get_account(account_id)
    if not acc:
        raise HTTPException(404, "Account not found")

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
                sessions.append({
                    "account": account_dir.name,
                    "file": md_file.name,
                    "path": str(md_file.relative_to(repo_dir(project_name))),
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
        raise HTTPException(404, "Session file not found")
    content = read_md(path)
    return {"success": True, "data": {"content": content}}
