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

    console.log("Original fields count:", collection.fields.length);
    
    // 1. Remove the old fields
    const filteredFields = collection.fields.filter(f => 
        f.name !== "system_route_active" && 
        f.name !== "system_route_override"
    );
    
    console.log("Fields after removal:", filteredFields.length);

    // 2. Add the correct ones
    const newActiveField = {
        name: "system_route_active",
        type: "bool",
        system: false,
        required: false,
        presentable: false
    };

    const newOverrideField = {
        name: "system_route_override",
        type: "url", // Ensuring it's a URL/text type
        system: false,
        required: false,
        presentable: false
    };

    filteredFields.push(newActiveField);
    filteredFields.push(newOverrideField);

    console.log("Final fields count to submit:", filteredFields.length);

    console.log("Patching collection schema (Drop & Add)...");
    const patchRes = await fetch("https://greenroute-pb.fly.dev/api/collections/links", {
        method: "PATCH",
        headers: { 
            "Authorization": authData.token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ fields: filteredFields })
    });

    if (patchRes.ok) {
        console.log("DATABASE SCHEMA REPAIRED SUCCESSFULLY!");
    } else {
        const err = await patchRes.json();
        console.error("FAILED TO REPAIR SCHEMA:", JSON.stringify(err, null, 2));
    }
}

run().catch(console.error);
