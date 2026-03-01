const formatSaudiDate = (dateStr) => {
    if (!dateStr) return '';
    const utcStr = dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`;
    const d = new Date(utcStr);
    return d.toLocaleString('en-US', { timeZone: 'UTC' });
};

const formatSaudiTime = (dateStr) => {
    if (!dateStr) return '';
    const utcStr = dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`;
    const d = new Date(utcStr);
    return d.toLocaleTimeString('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' });
};

let raw_db_string = "2026-03-01T20:30:00"; // What is sent from Python backend
console.log("DB string:", raw_db_string);
console.log("Display Date:", formatSaudiDate(raw_db_string));
console.log("Display Time:", formatSaudiTime(raw_db_string));

// Simulated scenario:
// 1. User sees "Display Time" which is 08:30 PM.
// 2. User edits it, the input box shows "2026-03-01T20:30".
// 3. User changes input box to "04:30 AM" (which makes the internal string "2026-03-01T04:30").
// 4. Send "2026-03-01T04:30" to the backend.
// 5. Backend saves "2026-03-01T04:30:00".
// 6. Next load, DB string is "2026-03-01T04:30:00".
// Let's see what is displayed:

let next_db_string = "2026-03-01T04:30:00";
console.log("\nNext DB string:", next_db_string);
console.log("Next Display Date:", formatSaudiDate(next_db_string));
console.log("Next Display Time:", formatSaudiTime(next_db_string));
