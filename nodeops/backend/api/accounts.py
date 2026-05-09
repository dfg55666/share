"""Account management routes."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.services import account_pool
from backend.services import nodeops_client as noc
from backend.services import credit_monitor

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


class AddAccountRequest(BaseModel):
    email: str
    auth_token: str = ""
    deployment_id: str = ""
    runtime_host: str = ""
    project_token: str = ""


class UpdateAccountRequest(BaseModel):
    email: str | None = None
    auth_token: str | None = None
    deployment_id: str | None = None
    runtime_host: str | None = None
    project_token: str | None = None
    status: str | None = None


class LoginRequest(BaseModel):
    email: str


class VerifyOTPRequest(BaseModel):
    email: str
    otp: str | None = None
    code: str | None = None


@router.get("")
def list_accounts():
    return {"success": True, "data": account_pool.list_accounts()}


@router.get("/available-count")
def available_count():
    return {"success": True, "data": {"count": account_pool.get_available_count()}}


@router.get("/{account_id}")
def get_account(account_id: str):
    acc = account_pool.get_account(account_id)
    if not acc:
        raise HTTPException(404, "Account not found")
    return {"success": True, "data": acc}


@router.post("")
def add_account(req: AddAccountRequest):
    try:
        acc = account_pool.add_account(
            email=req.email,
            auth_token=req.auth_token,
            deployment_id=req.deployment_id,
            runtime_host=req.runtime_host,
            project_token=req.project_token,
        )
        return {"success": True, "data": acc}
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/{account_id}")
def update_account(account_id: str, req: UpdateAccountRequest):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    acc = account_pool.update_account(account_id, updates)
    if not acc:
        raise HTTPException(404, "Account not found")
    return {"success": True, "data": acc}


@router.delete("/{account_id}")
def delete_account(account_id: str):
    if not account_pool.delete_account(account_id):
        raise HTTPException(404, "Account not found")
    return {"success": True}


@router.post("/{account_id}/refresh-credits")
async def refresh_credits(account_id: str):
    """Refresh credit balance for an account."""
    acc = account_pool.get_account(account_id)
    if not acc:
        raise HTTPException(404, "Account not found")
    if not acc.get("auth_token"):
        raise HTTPException(400, "Account has no auth token")

    result = await credit_monitor.check_credits(acc["auth_token"], account_id)
    return {"success": True, "data": result}


@router.post("/login")
async def login(req: LoginRequest):
    """Trigger OTP email for an account."""
    result = await noc.login(req.email)
    return {"success": True, "data": result}


@router.post("/verify-otp")
async def verify_otp(req: VerifyOTPRequest):
    """Verify OTP and get auth token."""
    otp = (req.otp or req.code or "").strip()
    if not otp:
        raise HTTPException(400, "otp is required")

    result = await noc.verify_otp(req.email, otp)
    # Auto-save token to account if it exists
    acc = account_pool.get_account_by_email(req.email)
    if not acc:
        try:
            acc = account_pool.add_account(email=req.email)
        except ValueError:
            acc = account_pool.get_account_by_email(req.email)
    if acc:
        data = result.get("data", {}) if isinstance(result, dict) else {}
        token = (
            (result.get("token") if isinstance(result, dict) else None)
            or (result.get("auth_token") if isinstance(result, dict) else None)
            or (data.get("token") if isinstance(data, dict) else None)
            or (data.get("auth_token") if isinstance(data, dict) else None)
            or ""
        )
        if token:
            account_pool.update_account(acc["id"], {"auth_token": token})
    return {"success": True, "data": result}
