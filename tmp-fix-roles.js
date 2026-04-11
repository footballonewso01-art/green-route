async function run() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
        console.log("Authenticating as superuser (https://greenroute-pb.fly.dev)...");
        const superAuthRes = await fetch("https://greenroute-pb.fly.dev/api/collections/_superusers/auth-with-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                identity: "test@mail.com",
                password: "123123123"
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        const superAuthData = await superAuthRes.json();
        if (!superAuthData.token) {
            console.error("Superuser auth failed", superAuthData);
            return;
        }

        const targets = ['test@mail.com', 'testt@mail.com'];
        console.log("Checking target accounts:", targets);
        
        const allUsersQuery = await fetch("https://greenroute-pb.fly.dev/api/collections/users/records", {
            headers: { "Authorization": superAuthData.token },
            signal: controller.signal
        });
        const allUsersData = await allUsersQuery.json();
        
        if (allUsersData.items) {
            for (const u of allUsersData.items) {
                if (targets.includes(u.email)) {
                    console.log(`User found: ${u.email} | Current Role: '${u.role}'`);
                    if (u.role !== 'admin') {
                        console.log(`-> Promoting ${u.email} to 'admin' role...`);
                        await fetch(`https://greenroute-pb.fly.dev/api/collections/users/records/${u.id}`, {
                            method: "PATCH",
                            headers: { 
                                "Authorization": superAuthData.token,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({ role: "admin" }),
                            signal: controller.signal
                        });
                        console.log(`Successfully promoted ${u.email}`);
                    } else {
                        console.log(`-> ${u.email} already has admin role.`);
                    }
                }
            }
        }
        console.log("Done.");
    } catch (err) {
        if (err.name === 'AbortError') {
            console.error("Request timed out after 10s. The Fly.io server might be slow or unresponsive.");
        } else {
            console.error("Error:", err);
        }
    } finally {
        clearTimeout(timeout);
    }
}

run();
