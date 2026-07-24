import os
from fastapi import Header, HTTPException, status

INTERNAL_TOKEN = os.getenv("INTERNAL_SERVICE_TOKEN", "change-me")

async def verify_internal_token(x_internal_token: str = Header(None)):
    if not x_internal_token or x_internal_token != INTERNAL_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal token",
        )
    return True
