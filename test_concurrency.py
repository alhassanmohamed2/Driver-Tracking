import threading
import http.client
import json
import urllib.parse

def get_token():
    conn = http.client.HTTPConnection("localhost", 8000)
    payload = urllib.parse.urlencode({'username': 'admin', 'password': 'admin123'})
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
    }
    conn.request("POST", "/auth/token", payload, headers)
    res = conn.getresponse()
    if res.status != 200:
        print("Failed to login", res.read().decode("utf-8"))
        return None
    data = json.loads(res.read().decode("utf-8"))
    return data.get("access_token")

def make_request(token):
    try:
        conn = http.client.HTTPConnection("localhost", 8000)
        headers = {
            'Authorization': f'Bearer {token}',
            'Accept': 'application/json'
        }
        conn.request("POST", "/admin/backups/create", "", headers)
        res = conn.getresponse()
        print(f"Status: {res.status}, Body: {res.read().decode('utf-8')}")
    except Exception as e:
        print(f"Exception: {e}")

def main():
    token = get_token()
    if not token: return
    
    print("Logged in, sending 3 concurrent backup requests via raw http.client...")
    threads = []
    for _ in range(3):
        t = threading.Thread(target=make_request, args=(token,))
        threads.append(t)
        t.start()
        
    for t in threads:
        t.join()

if __name__ == "__main__":
    main()
