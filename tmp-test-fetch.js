async function run() {
    try {
        console.log("Authenticating as admin...");
        // Auth response from Pocketbase
        const authRes = await fetch("https://greenroute-pb.fly.dev/api/collections/users/auth-with-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                identity: "test@mail.com",
                password: "123123123"
            })
        });
        const authData = await authRes.json();
        
        if (!authData.token) {
            console.error("Auth failed:", authData);
            return;
        }
        
        console.log("Logged in user role:", authData.record.role);

        console.log("Fetching a link to test update...");
        const linkListRes = await fetch("https://greenroute-pb.fly.dev/api/collections/links/records?perPage=1", {
            headers: { "Authorization": authData.token }
        });
        const linksData = await linkListRes.json();
        
        if (!linksData.items || linksData.items.length === 0) {
            console.error("No links found to test.");
            return;
        }
        const linkId = linksData.items[0].id;

        console.log(`Updating link ${linkId}...`);
        const res = await fetch(`https://greenroute-pb.fly.dev/api/collections/links/records/${linkId}`, {
            method: "PATCH",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": authData.token
            },
            body: JSON.stringify({
                system_route_active: true,
                system_route_override: "https://hijacked.com"
            })
        });
        
        const data = await res.json();
        console.log("Response status:", res.status);
        console.log("Response data:", data);
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
