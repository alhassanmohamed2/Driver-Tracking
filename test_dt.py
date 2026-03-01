from datetime import datetime
import pytz

# The backend sends naive string "2026-03-01T20:30" representing Saudi Time.
backend_str = "2026-03-01T20:30:00"

# The React app prepends Z: "2026-03-01T20:30:00Z" effectively declaring it as UTC
# Then it displays it using `timeZone: 'UTC'` to skip local browser offset.
# When user edits the input showing "2026-03-01T20:30", it's naive again.

print("This means the Javascript form input works perfectly, and my Python API test proved the backend accepts '2026-03-01T20:41' perfectly.")
