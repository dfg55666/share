"""
Credit monitor — checks if an account's credits are exhausted.
Uses multiple signals for reliable detection.
"""
import logging
from backend.services import nodeops_client as noc
from backend.services import account_pool

logger = logging.getLogger(__name__)


async def check_credits(auth_token: str, account_id: str | None = None) -> dict:
    """Check credit status for an account.

    Returns:
        {
            "exhausted": bool,
            "credits_remaining": float | None,
            "usage": dict | None,
            "error": str | None,
        }
    """
    result = {
        "exhausted": False,
        "credits_remaining": None,
        "usage": None,
        "error": None,
    }

    # Signal 1: Usage API (control plane)
    try:
        usage = await noc.get_usage(auth_token)
        result["usage"] = usage
        # Check if usage indicates exhaustion (field names may vary)
        remaining = usage.get("creditsRemaining", usage.get("remaining", usage.get("credits", None)))
        if remaining is not None:
            result["credits_remaining"] = float(remaining)
            if float(remaining) <= 0:
                result["exhausted"] = True
                logger.info(f"Credits exhausted (usage API): remaining={remaining}")
    except Exception as e:
        logger.warning(f"Usage API check failed: {e}")

    # Signal 2: Credits API (may have intermittent 500s)
    if not result["exhausted"]:
        try:
            credits_data = await noc.get_credits(auth_token)
            available = credits_data.get("available", credits_data.get("balance", credits_data.get("credits", None)))
            if available is not None:
                result["credits_remaining"] = float(available)
                if float(available) <= 0:
                    result["exhausted"] = True
                    logger.info(f"Credits exhausted (credits API): available={available}")
        except Exception as e:
            logger.warning(f"Credits API check failed: {e}")

    # Update cached credit balance
    if account_id and result["credits_remaining"] is not None:
        account_pool.update_credits(account_id, result["credits_remaining"])

    return result


def is_credit_error(error_response: dict | str) -> bool:
    """Check if an API error response indicates credit exhaustion.

    This is Signal 3 — called by the task engine when a send_message
    or other API call fails.
    """
    if isinstance(error_response, str):
        error_lower = error_response.lower()
        return any(kw in error_lower for kw in [
            "credit", "quota", "limit", "insufficient",
            "exceeded", "no remaining", "exhausted",
        ])

    if isinstance(error_response, dict):
        error_msg = str(error_response.get("error", "")).lower()
        error_code = str(error_response.get("code", "")).lower()
        return any(kw in error_msg or kw in error_code for kw in [
            "credit", "quota", "limit", "insufficient",
        ])

    return False
