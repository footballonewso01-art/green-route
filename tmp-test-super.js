async function run() {
    console.log("Authenticating as superuser...");
    const superAuthRes = await fetch("https://greenroute-pb.fly.dev/api/collections/_superusers/auth-with-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            identity: "test@mail.com",
            password: "123123123"
        })
    });
    
    const superAuthData = await superAuthRes.json();
    if (!superAuthData.token) {
        console.error("Superuser auth failed", superAuthData);
        return;
    }

    const targets = ['test@mail.com', 'testt@mail.com'];
    console.log("Checking target accounts...");
    const allUsersQuery = await fetch("https://greenroute-pb.fly.dev/api/collections/users/records", {
        headers: { "Authorization": superAuthData.token }
    });
    const allUsersData = await allUsersQuery.json();
    if (allUsersData.items) {
        for (const u of allUsersData.items) {
            if (targets.includes(u.email)) {
                console.log(`User: ${u.email}, Role: '${u.role}'`);
                if (u.role !== 'admin') {
                    console.log(`Updating ${u.email} to be an admin...`);
                    await fetch(`https://greenroute-pb.fly.dev/api/collections/users/records/${u.id}`, {
                        method: "PATCH",
                        headers: { 
                            "Authorization": superAuthData.token,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ role: "admin" })
                    });
                }
            }
        }
    }

    // Checking the links collection schema to see what the update rule is!
    const linksCollection = await fetch("https://greenroute-pb.fly.dev/api/collections/links", {
        headers: { "Authorization": superAuthData.token }
    });
    const linksCollectionData = await linksCollection.json();
    console.log("Links Collection Update Rule:", linksCollectionData.updateRule);
}

run().catch(console.error);
