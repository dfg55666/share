"""Workspace file proxy routes."""
from fastapi import APIRouter, HTTPException, Query, Response
from backend.services import nodeops_client as noc
from backend.services import account_pool

router = APIRouter(prefix="/api/files", tags=["files"])


@router.get("/tree")
async def get_file_tree(account_id: str, path: str = ""):
    """Get workspace directory listing."""
    acc = account_pool.get_account(account_id)
    if not acc:
        raise HTTPException(404, "Account not found")
    if not acc.get("runtime_host"):
        raise HTTPException(400, "Account has no active deployment")

    data = await noc.get_file_tree(
        acc["runtime_host"], acc["project_token"], acc["auth_token"], path
    )
    return {"success": True, "data": data}


@router.get("/content")
async def get_file_content(account_id: str, path: str = Query(...)):
    """Get file content from workspace."""
    acc = account_pool.get_account(account_id)
    if not acc:
        raise HTTPException(404, "Account not found")

    content = await noc.get_file_content(
        acc["runtime_host"], acc["project_token"], acc["auth_token"], path
    )

    # Try to detect if it's text
    try:
        text = content.decode("utf-8")
        return Response(content=text, media_type="text/plain; charset=utf-8")
    except UnicodeDecodeError:
        return Response(content=content, media_type="application/octet-stream")


@router.get("/status")
async def get_file_status(account_id: str):
    """Get workspace file status."""
    acc = account_pool.get_account(account_id)
    if not acc:
        raise HTTPException(404, "Account not found")

    data = await noc.get_file_status(
        acc["runtime_host"], acc["project_token"], acc["auth_token"]
    )
    return {"success": True, "data": data}


@router.get("/tree/task")
async def get_file_tree_for_task(project_name: str, task_id: str, path: str = ""):
    """Get file tree using the task's current account/deployment."""
    from backend.services.task_engine import get_task
    task = get_task(project_name, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    if not task.get("current_account_id"):
        raise HTTPException(400, "Task has no active account")

    acc = account_pool.get_account(task["current_account_id"])
    if not acc:
        raise HTTPException(404, "Account not found")

    data = await noc.get_file_tree(
        task.get("current_runtime_host", acc.get("runtime_host", "")),
        task.get("current_project_token", acc.get("project_token", "")),
        acc["auth_token"], path
    )
    return {"success": True, "data": data}
