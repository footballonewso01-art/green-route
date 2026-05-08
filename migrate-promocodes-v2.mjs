const email = 'test@mail.com';
const password = '123123123';
const pbUrl = 'https://greenroute-pb-staging.fly.dev';

async function migrate() {
    console.log("Authenticating to Staging...");
    const authRes = await fetch(`${pbUrl}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: email, password })
    });
    if (!authRes.ok) throw new Error("Auth failed");
    const token = (await authRes.json()).token;

    const headers = {
        'Authorization': token,
        'Content-Type': 'application/json'
    };

    // 0. Delete existing broken collections
    try {
        const promoRes = await fetch(`${pbUrl}/api/collections/promocodes`, { headers });
        if (promoRes.ok) {
            const promoId = (await promoRes.json()).id;
            await fetch(`${pbUrl}/api/collections/${promoId}`, { method: 'DELETE', headers });
            console.log("Deleted old promocodes collection");
        }
        
        const logsRes = await fetch(`${pbUrl}/api/collections/promocode_logs`, { headers });
        if (logsRes.ok) {
            const logsId = (await logsRes.json()).id;
            await fetch(`${pbUrl}/api/collections/${logsId}`, { method: 'DELETE', headers });
            console.log("Deleted old promocode_logs collection");
        }
    } catch (e) {
        console.log("Error deleting old collections (ignoring)");
    }

    // 1. Create `promocodes` collection (PB 0.23 schema format)
    console.log("Creating promocodes collection...");
    const promoRes = await fetch(`${pbUrl}/api/collections`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            name: "promocodes",
            type: "base",
            system: false,
            fields: [ // PB 0.23 uses "fields" instead of "schema"
                { name: "code", type: "text", required: true, max: 50 },
                { name: "max_uses", type: "number", required: false, noDecimal: true },
                { name: "current_uses", type: "number", required: false, noDecimal: true },
                { name: "reward_plan", type: "select", required: true, maxSelect: 1, values: ["pro", "agency"] },
                { name: "reward_days", type: "number", required: true, min: 1, noDecimal: true },
                { name: "is_active", type: "bool", required: false }
            ],
            listRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
            viewRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
            createRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
            updateRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
            deleteRule: null
        })
    });
    
    let promoColId = null;
    if (promoRes.ok) {
        const data = await promoRes.json();
        promoColId = data.id;
        console.log("✅ Created promocodes collection (ID:", promoColId, ")");
        
        await fetch(`${pbUrl}/api/collections/${promoColId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                indexes: [
                    `CREATE UNIQUE INDEX "idx_promocode_code" ON "promocodes" ("code")`
                ]
            })
        });
    } else {
        const err = await promoRes.json();
        console.log("⚠️ Failed to create promocodes:", err);
        return;
    }

    // 2. Create `promocode_logs` collection
    console.log("Creating promocode_logs collection...");
    const logsRes = await fetch(`${pbUrl}/api/collections`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            name: "promocode_logs",
            type: "base",
            system: false,
            fields: [
                { name: "promocode_id", type: "relation", required: true, collectionId: promoColId, cascadeDelete: false, maxSelect: 1 },
                { name: "user_id", type: "relation", required: true, collectionId: "_pb_users_auth_", cascadeDelete: true, maxSelect: 1 },
                { name: "plan_awarded", type: "text", required: true },
                { name: "days_awarded", type: "number", required: true, noDecimal: true }
            ],
            listRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
            viewRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
            createRule: null,
            updateRule: null,
            deleteRule: null
        })
    });
    
    if (logsRes.ok) {
        console.log("✅ Created promocode_logs collection");
    } else {
        const err = await logsRes.json();
        console.log("⚠️ Failed to create promocode_logs:", err);
    }

    // 3. Update `users` collection
    console.log("Updating users collection...");
    const usersColRes = await fetch(`${pbUrl}/api/collections/users`, { headers });
    const usersCol = await usersColRes.json();
    
    const newFields = [];
    if (!usersCol.fields.find(f => f.name === 'promocode_used')) {
        newFields.push({ name: 'promocode_used', type: 'relation', required: false, collectionId: promoColId, maxSelect: 1, cascadeDelete: false });
    }
    if (!usersCol.fields.find(f => f.name === 'fallback_plan')) {
        newFields.push({ name: 'fallback_plan', type: 'text', required: false });
    }
    if (!usersCol.fields.find(f => f.name === 'fallback_expires_at')) {
        newFields.push({ name: 'fallback_expires_at', type: 'date', required: false });
    }

    if (newFields.length > 0) {
        usersCol.fields.push(...newFields);
        const updateUsersRes = await fetch(`${pbUrl}/api/collections/users`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ fields: usersCol.fields })
        });
        if (updateUsersRes.ok) {
            console.log("✅ Updated users collection with promocode fields");
        } else {
            console.log("❌ Failed to update users collection:", await updateUsersRes.text());
        }
    } else {
        console.log("✅ Users collection already has promocode fields");
    }

    console.log("Migration complete!");
}

migrate();
