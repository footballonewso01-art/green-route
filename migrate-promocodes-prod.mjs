const email = 'test@mail.com';
const password = '123123123';
const pbUrl = 'https://greenroute-pb.fly.dev';

async function migrate() {
    console.log("Authenticating to Production...");
    const authRes = await fetch(`${pbUrl}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: email, password })
    });
    
    if (!authRes.ok) {
        console.error("Auth failed. Please check credentials.");
        return;
    }
    
    const token = (await authRes.json()).token;
    const headers = {
        'Authorization': token,
        'Content-Type': 'application/json'
    };

    async function getCollection(name) {
        const res = await fetch(`${pbUrl}/api/collections/${name}`, { headers });
        if (res.ok) return await res.json();
        return null;
    }

    // 1. Create or verify `promocodes` collection
    console.log("Checking promocodes collection...");
    let promocodesCol = await getCollection("promocodes");
    
    if (!promocodesCol) {
        console.log("Creating promocodes collection...");
        const res = await fetch(`${pbUrl}/api/collections`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name: "promocodes",
                type: "base",
                fields: [
                    { name: "code", type: "text", required: true },
                    { name: "max_uses", type: "number" },
                    { name: "current_uses", type: "number" },
                    { name: "reward_plan", type: "select", required: true, values: ["pro", "agency"], maxSelect: 1 },
                    { name: "reward_days", type: "number", required: true },
                    { name: "is_active", type: "bool" },
                    { name: "created", type: "autodate", onCreate: true },
                    { name: "updated", type: "autodate", onCreate: true, onUpdate: true }
                ],
                listRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
                viewRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
                createRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
                updateRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
                deleteRule: null,
                indexes: ["CREATE UNIQUE INDEX \"idx_promocode_code\" ON \"promocodes\" (\"code\")"]
            })
        });
        if (res.ok) {
            promocodesCol = await res.json();
            console.log("✅ Created promocodes collection");
        } else {
            console.error("❌ Failed to create promocodes:", await res.text());
            return;
        }
    } else {
        console.log("✅ Promocodes collection already exists");
        // Verify fields exist
        const hasCreated = promocodesCol.fields.some(f => f.name === "created");
        if (!hasCreated) {
            console.log("Adding created/updated fields to promocodes...");
            promocodesCol.fields.push(
                { name: "created", type: "autodate", onCreate: true },
                { name: "updated", type: "autodate", onCreate: true, onUpdate: true }
            );
            await fetch(`${pbUrl}/api/collections/promocodes`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ fields: promocodesCol.fields })
            });
        }
    }

    const promoColId = promocodesCol.id;

    // 2. Create or verify `promocode_logs` collection
    console.log("Checking promocode_logs collection...");
    let logsCol = await getCollection("promocode_logs");
    
    if (!logsCol) {
        console.log("Creating promocode_logs collection...");
        const res = await fetch(`${pbUrl}/api/collections`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name: "promocode_logs",
                type: "base",
                fields: [
                    { name: "promocode_id", type: "relation", required: true, collectionId: promoColId, maxSelect: 1 },
                    { name: "user_id", type: "relation", required: true, collectionId: "_pb_users_auth_", maxSelect: 1, cascadeDelete: true },
                    { name: "plan_awarded", type: "text", required: true },
                    { name: "days_awarded", type: "number", required: true },
                    { name: "created", type: "autodate", onCreate: true },
                    { name: "updated", type: "autodate", onCreate: true, onUpdate: true }
                ],
                listRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
                viewRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
                createRule: null,
                updateRule: null,
                deleteRule: null
            })
        });
        if (res.ok) {
            console.log("✅ Created promocode_logs collection");
        } else {
            console.error("❌ Failed to create promocode_logs:", await res.text());
        }
    } else {
        console.log("✅ Promocode_logs collection already exists");
        // Verify fields exist
        logsCol = await getCollection("promocode_logs");
        if (logsCol && !logsCol.fields.some(f => f.name === "created")) {
            console.log("Adding created/updated fields to promocode_logs...");
            logsCol.fields.push(
                { name: "created", type: "autodate", onCreate: true },
                { name: "updated", type: "autodate", onCreate: true, onUpdate: true }
            );
            await fetch(`${pbUrl}/api/collections/promocode_logs`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ fields: logsCol.fields })
            });
        }
    }

    // 3. Update `users` collection
    console.log("Checking users collection fields...");
    const usersCol = await getCollection("users");
    if (usersCol) {
        const hasPromocodeField = usersCol.fields.some(f => f.name === "promocode_used");
        if (!hasPromocodeField) {
            console.log("Adding promocode_used field to users...");
            usersCol.fields.push({
                name: "promocode_used",
                type: "relation",
                collectionId: promoColId,
                maxSelect: 1,
                cascadeDelete: false
            });
            const res = await fetch(`${pbUrl}/api/collections/users`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ fields: usersCol.fields })
            });
            if (res.ok) {
                console.log("✅ Added promocode_used field to users");
            } else {
                console.error("❌ Failed to update users fields:", await res.text());
            }
        } else {
            console.log("✅ Users already has promocode_used field");
        }
    }

    console.log("Migration finished!");
}

migrate();
