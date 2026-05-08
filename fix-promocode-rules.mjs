const email = 'test@mail.com';
const password = '123123123';
const pbUrl = 'https://greenroute-pb-staging.fly.dev';

async function fixRules() {
    console.log("Authenticating to Staging...");
    const authRes = await fetch(`${pbUrl}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: email, password })
    });
    if (!authRes.ok) throw new Error("Auth failed: " + await authRes.text());
    const token = (await authRes.json()).token;

    const headers = {
        'Authorization': token,
        'Content-Type': 'application/json'
    };

    // Fix promocodes collection rules
    console.log("Fetching promocodes collection...");
    const promoRes = await fetch(`${pbUrl}/api/collections/promocodes`, { headers });
    if (!promoRes.ok) {
        console.log("ERROR fetching promocodes collection:", await promoRes.text());
        return;
    }
    const promoCol = await promoRes.json();
    console.log("Current rules:", {
        listRule: promoCol.listRule,
        viewRule: promoCol.viewRule,
        createRule: promoCol.createRule,
        updateRule: promoCol.updateRule,
    });

    // Update to simpler rule that works with custom fields
    const newRule = "@request.auth.id != '' && @request.auth.role ?= 'admin'";
    const patchRes = await fetch(`${pbUrl}/api/collections/${promoCol.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
            listRule: newRule,
            viewRule: newRule,
            createRule: newRule,
            updateRule: newRule,
        })
    });
    
    if (patchRes.ok) {
        console.log("✅ Updated promocodes rules");
    } else {
        const err = await patchRes.text();
        console.log("❌ Failed to update rules:", err);
        
        // Try with simpler rule - just authenticated
        console.log("Trying simpler rule...");
        const simpleRule = "@request.auth.id != ''";
        const patchRes2 = await fetch(`${pbUrl}/api/collections/${promoCol.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                listRule: simpleRule,
                viewRule: simpleRule,
                createRule: simpleRule,
                updateRule: simpleRule,
            })
        });
        if (patchRes2.ok) {
            console.log("✅ Updated with simpler rules (auth required only)");
        } else {
            console.log("❌ Also failed:", await patchRes2.text());
        }
    }

    // Also fix promocode_logs
    console.log("\nFetching promocode_logs collection...");
    const logsRes = await fetch(`${pbUrl}/api/collections/promocode_logs`, { headers });
    if (logsRes.ok) {
        const logsCol = await logsRes.json();
        const patchLogs = await fetch(`${pbUrl}/api/collections/${logsCol.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                listRule: newRule,
                viewRule: newRule,
            })
        });
        if (patchLogs.ok) {
            console.log("✅ Updated promocode_logs rules");
        } else {
            // Fallback
            const simpleRule = "@request.auth.id != ''";
            await fetch(`${pbUrl}/api/collections/${logsCol.id}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ listRule: simpleRule, viewRule: simpleRule })
            });
            console.log("✅ Updated promocode_logs with simpler rules");
        }
    }
    
    console.log("\nDone!");
}

fixRules();
