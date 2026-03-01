import requests

base_url = "http://localhost:8003"
resp = requests.post(f"{base_url}/auth/token", data={"username": "admin", "password": "admin123"})
token = resp.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

trips = requests.get(f"{base_url}/admin/trips", headers=headers).json()
for t in trips:
    if t["logs"]:
        trip = t
        break
else:
    print("NO TRIPS WITH LOGS IN DB")
    exit(1)

trip_id = trip["id"]
logs = trip["logs"]
print("BEFORE Logs:", [(l["id"], l["state"], l["timestamp"]) for l in logs])

log_updates = []
for l in logs:
    log_updates.append({
        "id": l["id"], 
        "timestamp": "2026-03-01T20:41", # String precisely from datetime-local input
        "address": l["address"], 
        "state": l["state"]
    })

payload = {
    "driver_id": trip["driver_id"],
    "status": trip["status"],
    "start_date": trip["start_date"],
    "logs": log_updates
}

ret = requests.put(f"{base_url}/admin/trips/{trip_id}", json=payload, headers=headers)
if ret.status_code != 200:
    print("Error:", ret.status_code, ret.text)
else:
    updated = ret.json()
    print("AFTER Logs:", [(l["id"], l["state"], l["timestamp"]) for l in updated.get("logs", [])])
