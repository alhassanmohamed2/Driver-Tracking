import asyncio
import httpx

async def make_request(client, token):
    headers = {"Authorization": f"Bearer {token}"}
    resp = await client.post("http://localhost:8000/admin/backups/create", headers=headers)
    print(f"Status: {resp.status_code}, Body: {resp.text}")

async def main():
    async with httpx.AsyncClient() as client:
        # Get token
        resp = await client.post("http://localhost:8000/auth/token", data={"username": "admin", "password": "password"})
        token = resp.json().get("access_token")
        
        # Make 3 concurrent requests
        tasks = [make_request(client, token) for _ in range(3)]
        await asyncio.gather(*tasks)

if __name__ == "__main__":
    asyncio.run(main())
