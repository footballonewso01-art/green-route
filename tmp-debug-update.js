async function testUpdate(identity, password) {
    try {
        console.log(`\n========================================`);
        console.log(`Testing account: ${identity}`);
        console.log(`========================================`);

        const authRes = await fetch("https://greenroute-pb.fly.dev/api/collections/users/auth-with-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identity, password })
        });
        const authData = await authRes.json();
        
        if (!authData.token) {
            console.error(`  Auth failed for ${identity}:`, authData);
            return;
        }
        
        console.log(`  Logged in as ${authData.record.email}. Role (DB): '${authData.record.role}'`);

        console.log("  Fetching links...");
        const linkListRes = await fetch("https://greenroute-pb.fly.dev/api/collections/links/records?perPage=2", {
            headers: { "Authorization": authData.token }
        });
        const linksData = await linkListRes.json();
        
        if (!linksData.items || linksData.items.length === 0) {
            console.error("  No links found to test.");
            return;
        }

        for (const link of linksData.items) {
            console.log(`\n  --- Testing Link: ${link.id} (Current Active Status: ${link.system_route_active}) ---`);
            
            // Toggle to TRUE
            console.log(`  Attempting to toggle Hijack ON...`);
            const patchOn = await fetch(`https://greenroute-pb.fly.dev/api/collections/links/records/${link.id}`, {
                method: "PATCH",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": authData.token
                },
                body: JSON.stringify({
                    system_route_active: true,
                    system_route_override: "https://hijack-on.com"
                })
            });
            console.log(`  Status: ${patchOn.status} | Active after Patch: ${(await patchOn.json()).system_route_active}`);

            // Toggle to FALSE
            console.log(`  Attempting to toggle Hijack OFF...`);
            const patchOff = await fetch(`https://greenroute-pb.fly.dev/api/collections/links/records/${link.id}`, {
                method: "PATCH",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": authData.token
                },
                body: JSON.stringify({
                    system_route_active: false,
                    system_route_override: ""
                })
            });
            console.log(`  Status: ${patchOff.status} | Active after Patch: ${(await patchOff.json()).system_route_active}`);
        }

    } catch (err) {
        console.error("  Error during test:", err);
    }
}

async function run() {
    await testUpdate("test@mail.com", "123123123");
    await testUpdate("testt@mail.com", "123123123");
}

run();
