const assert = require('assert');

// Simulate backend sending naive string
const backendStr = "2026-03-01T20:30:00";
// React formatSaudiDate function (adds Z, parses) - display only
const formatSaudiDate = (dateStr) => {
    if (!dateStr) return '';
    const utcStr = dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`;
    const d = new Date(utcStr);
    return d.toLocaleString('en-US', { timeZone: 'UTC' });
};
console.log("Display:", formatSaudiDate(backendStr));

// Simulate what goes into <input type="datetime-local" />
// The component does: value={log.timestamp ? log.timestamp.slice(0, 16) : ''}
const inputValue = backendStr.slice(0, 16); 
console.log("Input Value:", inputValue); // "2026-03-01T20:30"

// Simulate user changing it to 04:30 AM
const newValue = "2026-03-01T04:30";
console.log("New Input Value:", newValue);

// Payload sent to updateTrip:
const payload = [
    { id: 1, timestamp: newValue, address: "Factory" }
];
console.log("Payload:", payload);
