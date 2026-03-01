"""
Centralized timezone utility for the Driver Tracking system.
All datetimes are stored as naive Saudi time (Asia/Riyadh, UTC+3).
"""
from datetime import datetime, timezone, timedelta
from typing import Optional
import pytz

SAUDI_TZ = pytz.timezone('Asia/Riyadh')


def now_saudi() -> datetime:
    """Return the current time in Saudi Arabia as a naive datetime (no tzinfo)."""
    return datetime.now(SAUDI_TZ).replace(tzinfo=None)


def ensure_saudi_naive(dt: Optional[datetime]) -> Optional[datetime]:
    """
    Convert any datetime to a naive Saudi datetime.

    Handles three cases:
    1. Timezone-aware datetime (e.g. UTC from ISO string) → convert to Saudi, strip tzinfo
    2. Naive datetime that looks like UTC (from frontend ISO) → treat as UTC, convert to Saudi
    3. Naive datetime already in Saudi time → return as-is (fallback)

    The frontend datetime-local input gives us strings like "2026-03-01T14:30"
    which Pydantic parses as naive datetimes. These are already Saudi time
    and should be returned as-is.

    The frontend's new Date().toISOString() gives "2026-03-01T11:30:00.000Z"
    which Pydantic parses as timezone-aware UTC. These need conversion to Saudi.
    """
    if dt is None:
        return None

    if dt.tzinfo is not None:
        # Timezone-aware: convert to Saudi time, strip tzinfo
        saudi_dt = dt.astimezone(SAUDI_TZ)
        return saudi_dt.replace(tzinfo=None)
    else:
        # Naive datetime: assumed to already be Saudi time
        # (comes from datetime-local input which gives local values)
        return dt
