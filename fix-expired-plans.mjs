const pbUrl = 'https://greenroute-pb.fly.dev';

async function run() {
    // Wait for PB
    for (let i = 0; i < 10; i++) {
        try { const h = await fetch(pbUrl + '/api/health'); if (h.status === 200) break; } catch(e) {}
        await new Promise(r => setTimeout(r, 2000));
    }

    const sa = await (await fetch(pbUrl + '/api/collections/_superusers/auth-with-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: 'test@mail.com', password: '123123123' })
    })).json();
    const t = sa.token;
    const h = { Authorization: t, 'Content-Type': 'application/json' };

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const filter = `plan != "" && plan != "creator" && plan_expires_at != "" && plan_expires_at <= "${now}"`;
    const res = await fetch(pbUrl + '/api/collections/users/records?filter=' + encodeURIComponent(filter) + '&fields=id,email,plan,plan_expires_at&perPage=100', {
        headers: { Authorization: t }
    });
    const data = await res.json();
    console.log('Found', data.totalItems, 'expired users. Downgrading...');

    let count = 0;
    for (const u of data.items) {
        const r = await fetch(pbUrl + '/api/collections/users/records/' + u.id, {
            method: 'PATCH', headers: h,
            body: JSON.stringify({ plan: '', plan_expires_at: '', fallback_plan: '', fallback_expires_at: '' })
        });
        if (r.status === 200) {
            count++;
            console.log('  OK:', u.email, '(was:', u.plan + ')');
        } else {
            const err = await r.json();
            console.log('  FAIL:', u.email, JSON.stringify(err));
        }
    }
    console.log('\nDowngraded', count, 'of', data.totalItems, 'users');
}

run().catch(e => console.error(e));
