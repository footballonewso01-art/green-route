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

    // 1. Create `promocodes` collection
    console.log("Creating promocodes collection...");
    const promoRes = await fetch(`${pbUrl}/api/collections`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            name: "promocodes",
            type: "base",
            system: false,
            schema: [
                { name: "code", type: "text", required: true, options: { min: null, max: 50, pattern: "" } },
                { name: "max_uses", type: "number", required: false, options: { min: null, max: null, noDecimal: true } },
                { name: "current_uses", type: "number", required: false, options: { min: null, max: null, noDecimal: true } },
                { name: "reward_plan", type: "select", required: true, options: { maxSelect: 1, values: ["pro", "agency"] } },
                { name: "reward_days", type: "number", required: true, options: { min: 1, max: null, noDecimal: true } },
                { name: "is_active", type: "bool", required: false, options: {} }
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
        
        // Add unique index on `code` (Requires PB >= 0.22 syntax for indexes)
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
        console.log("⚠️ Failed to create promocodes (might already exist):", err);
        // fetch existing ID
        const existing = await fetch(`${pbUrl}/api/collections/promocodes`, { headers });
        if (existing.ok) promoColId = (await existing.json()).id;
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
            schema: [
                { name: "promocode_id", type: "relation", required: true, options: { collectionId: promoColId, cascadeDelete: false, maxSelect: 1 } },
                { name: "user_id", type: "relation", required: true, options: { collectionId: "_pb_users_auth_", cascadeDelete: true, maxSelect: 1 } },
                { name: "plan_awarded", type: "text", required: true, options: {} },
                { name: "days_awarded", type: "number", required: true, options: { noDecimal: true } }
            ],
            listRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
            viewRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
            createRule: null, // Only created via hooks
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
        newFields.push({ name: 'promocode_used', type: 'relation', required: false, options: { collectionId: promoColId, maxSelect: 1, cascadeDelete: false } });
    }
    if (!usersCol.fields.find(f => f.name === 'fallback_plan')) {
        newFields.push({ name: 'fallback_plan', type: 'text', required: false, options: {} });
    }
    if (!usersCol.fields.find(f => f.name === 'fallback_expires_at')) {
        newFields.push({ name: 'fallback_expires_at', type: 'date', required: false, options: {} });
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
