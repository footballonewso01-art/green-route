const email = 'test@mail.com';
const password = '123123123';
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
    const col = await res.json();
    console.log(JSON.stringify(col.fields.filter(f => f.type === 'relation'), null, 2));
}

check();
