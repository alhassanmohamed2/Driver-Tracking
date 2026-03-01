const puppeteer = require('puppeteer');

(async () => {
    // Launch browser
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    // Listen to console to intercept our logged payload
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

    try {
        await page.goto('http://localhost:8548');
        await page.waitForSelector('input[name="username"]', { timeout: 5000 });
        
        // Use default admin credentials or previous ones
        await page.type('input[name="username"]', 'admin');
        await page.type('input[name="password"]', 'admin123'); // or whatever was set in DB reset
        await page.click('button[type="submit"]');

        await page.waitForSelector('table', { timeout: 5000 });
        
        // Click edit on the first trip
        await page.click('button[title="Edit"]');
        
        // Wait for modal
        await page.waitForSelector('input[type="datetime-local"]', { timeout: 5000 });
        
        // Find the log input explicitly and change it
        const inputs = await page.$$('input[type="datetime-local"]');
        if (inputs.length > 1) {
            // Usually the 2nd one is the first log's time
            await inputs[1].type(''); // clear it
            await inputs[1].type('0438PM'); // or just set value via evaluate to guarantee string
            await page.evaluate(() => {
                const els = document.querySelectorAll('input[type="datetime-local"]');
                if (els[1]) {
                    els[1].value = "2026-03-01T20:41";
                    // Dispatch event for React
                    els[1].dispatchEvent(new Event('input', { bubbles: true }));
                    els[1].dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        }

        // Save
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const saveBtn = btns.find(b => b.textContent.includes('Save'));
            if (saveBtn) saveBtn.click();
        });

        // Wait a sec for the payload to log
        await new Promise(r => setTimeout(r, 2000));
        
    } catch (e) {
        console.error('Test Error:', e);
    } finally {
        await browser.close();
    }
})();
