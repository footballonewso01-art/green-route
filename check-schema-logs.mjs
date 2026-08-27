const email = process.env.POCKETBASE_SUPERUSER_EMAIL;
const password = process.env.POCKETBASE_SUPERUSER_PASSWORD;

if (!email || !password) {
    throw new Error("Set POCKETBASE_SUPERUSER_EMAIL and POCKETBASE_SUPERUSER_PASSWORD before running this maintenance script.");
}
const pbUrl = 'https://greenroute-pb-staging.fly.dev';

async function check() {
    const authRes = await fetch(`${pbUrl}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: email, password })
    });
    const token = (await authRes.json()).token;

    const res = await fetch(`${pbUrl}/api/collections/promocode_logs`, {
        headers: { 'Authorization': token }
    });
    if (!res.ok) {
        console.log("No promocode_logs collection.");
        return;
    }
    const col = await res.json();
    console.log(JSON.stringify(col.fields, null, 2));
}

check();
