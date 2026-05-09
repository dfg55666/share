"""SSE event forwarding — subscribes to NodeOps SSE and relays to frontend."""
import asyncio
import json
import logging
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from backend.services import nodeops_client as noc
from backend.services import account_pool
from backend.services.task_engine import get_task

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("/session/{session_id}")
async def stream_session_events(session_id: str, account_id: str):
    """SSE stream: forward NodeOps session events to frontend."""
    acc = account_pool.get_account(account_id)
    if not acc:
        raise HTTPException(404, "Account not found")
    if not acc.get("runtime_host") or not acc.get("project_token"):
        raise HTTPException(400, "Account has no active deployment")

    async def event_generator():
        try:
            # Use project_token as the SSE token (as per NodeOps API)
            async for line in noc.connect_sse(
                acc["runtime_host"], acc["project_token"], session_id
            ):
                if line:
                    yield f"{line}\n"
                else:
                    yield "\n"
        except Exception as e:
            logger.error(f"SSE stream error: {e}")
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/task/{project_name}/{task_id}")
async def stream_task_events(project_name: str, task_id: str):
    """SSE stream: poll task status and messages, forward to frontend."""
    from backend.services.task_engine import get_task_messages, is_task_running

    async def event_generator():
        last_msg_count = 0
        while True:
            task = get_task(project_name, task_id)
            if not task:
                yield f"event: error\ndata: {json.dumps({'error': 'Task not found'})}\n\n"
                break

            # Send status update
            yield f"event: status\ndata: {json.dumps({'status': task['status'], 'loop_count': task.get('loop_count', 0)})}\n\n"

            # Send new messages
            messages = get_task_messages(task_id)
            if len(messages) > last_msg_count:
                for msg in messages[last_msg_count:]:
                    yield f"event: message\ndata: {json.dumps(msg, default=str)}\n\n"
                last_msg_count = len(messages)

            # Stop if task is done
            if task["status"] in ("completed", "failed", "canceled", "stopped", "blocked", "blocked_no_account"):
                yield f"event: done\ndata: {json.dumps({'status': task['status']})}\n\n"
                break

            await asyncio.sleep(3)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
