from datetime import datetime, timezone, timedelta

KST = timezone(timedelta(hours=9))


def now_kst() -> datetime:
    """Return current time as naive datetime in KST (UTC+9)."""
    return datetime.now(tz=KST).replace(tzinfo=None)
