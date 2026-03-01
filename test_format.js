const tripForm = {
    logs: [
        {
            id: 1,
            timestamp: "2026-03-01T20:30",
            state: "exit_factory",
            address: "Factory"
        }
    ]
};
const e_target_value = "2026-03-01T23:30";
tripForm.logs[0].timestamp = e_target_value;

const payload = tripForm.logs.map(l => ({
    id: l.id,
    timestamp: l.timestamp || null,
    address: l.address
}));

console.log("PAYLOAD TIMESTAMP SENT TO API:", payload[0].timestamp);

const formatSaudiDate = (dateStr) => {
    if (!dateStr) return '';
    const utcStr = dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`;
    const d = new Date(utcStr);
    return d.toLocaleString('en-US', { timeZone: 'UTC' });
};

console.log("FORMAT SAUDI DATE OUT:", formatSaudiDate("2026-03-01T23:30:00"));

