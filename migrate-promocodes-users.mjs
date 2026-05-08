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

    // Get promocodes collection ID
    const promoRes = await fetch(`${pbUrl}/api/collections/promocodes`, { headers });
    const promoColId = (await promoRes.json()).id;
    console.log("Promocodes collection ID:", promoColId);

    // Update users
    console.log("Updating users collection...");
    const usersColRes = await fetch(`${pbUrl}/api/collections/users`, { headers });
    const usersCol = await usersColRes.json();
    
    const newFields = [];
    if (!usersCol.fields.find(f => f.name === 'promocode_used')) {
        newFields.push({ name: 'promocode_used', type: 'relation', required: false, options: { collectionId: promoColId, maxSelect: 1, cascadeDelete: false } });
    }
    if (!usersCol.fields.find(f => f.name === 'fallback_plan')) {
        newFields.push({ name: 'fallback_plan', type: 'text', required: false, options: { min: null, max: null, pattern: "" } });
    }
    if (!usersCol.fields.find(f => f.name === 'fallback_expires_at')) {
        newFields.push({ name: 'fallback_expires_at', type: 'date', required: false, options: { min: "", max: "" } });
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
}

migrate();
