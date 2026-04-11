async function run() {
    console.log("Authenticating as superuser...");
    const authRes = await fetch("https://greenroute-pb.fly.dev/api/collections/_superusers/auth-with-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: "test@mail.com", password: "123123123" })
    });
    const authData = await authRes.json();
    if (!authData.token) {
        console.error("Auth failed", authData);
        return;
    }

    console.log("Fetching current links collection...");
    const collRes = await fetch("https://greenroute-pb.fly.dev/api/collections/links", {
        headers: { "Authorization": authData.token }
    });
    const collection = await collRes.json();

    let foundActive = false;
    let foundOverride = false;

    // Mutate the fields to the correct types
    for (let f of collection.fields) {
        if (f.name === "system_route_active") {
            console.log(`Found field ${f.name} - Current type: ${f.type}. Fixing to 'bool'...`);
            f.type = "bool";
            foundActive = true;
        }
        if (f.name === "system_route_override") {
            console.log(`Found field ${f.name} - Current type: ${f.type}. Ensuring it's 'url' or 'text'...`);
            if (f.type !== "url" && f.type !== "text" && f.type !== "editor") {
                f.type = "url"; 
            }
            foundOverride = true;
        }
    }

    if (!foundActive || !foundOverride) {
        console.error("One or more system_route fields missing. Cannot patch types.");
        return;
    }

    console.log("Patching collection schema...");
    const patchRes = await fetch("https://greenroute-pb.fly.dev/api/collections/links", {
        method: "PATCH",
        headers: { 
            "Authorization": authData.token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ fields: collection.fields })
    });

    if (patchRes.ok) {
        console.log("SCHEMA SUCCESSFULLY REPAIRED!");
    } else {
        console.error("FAILED TO REPAIR SCHEMA:", await patchRes.json());
    }
}

run().catch(console.error);
