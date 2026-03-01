const axios = require('axios');
async function run() {
    const resAuth = await axios.post("http://localhost:8003/auth/token", new URLSearchParams({username: "admin", password: "admin123"}));
    const token = resAuth.data.access_token;
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
    
    const trips = await axios.get("http://localhost:8003/admin/trips", authHeaders);
    let trip = trips.data.find(t => t.logs.length > 0);
    console.log("OLD TRIP START DATE:", trip.start_date);
    
    const payload = {
        driver_id: trip.driver_id,
        status: trip.status,
        start_date: "2026-03-01T04:00",
        logs: []
    };
    const res = await axios.put(`http://localhost:8003/admin/trips/${trip.id}`, payload, authHeaders);
    console.log("NEW TRIP START DATE:", res.data.start_date);
}
run();
