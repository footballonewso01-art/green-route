onRecordCreateRequest((e) => {
    try {
        console.log("---- CREATE TRIGGERED ----");
        console.log("e keys:", JSON.stringify(Object.keys(e)));
        console.log("e.httpContext:", !!e.httpContext);
        console.log("e.requestInfo:", !!e.requestInfo);
        if (e.requestInfo) {
            console.log("requestInfo keys:", JSON.stringify(Object.keys(e.requestInfo)));
        }
        console.log("e.request:", !!e.request);
        if (e.request) {
            console.log("request keys:", JSON.stringify(Object.keys(e.request)));
        }
    } catch(err) {
        console.log("DEBUG ERROR:", err);
    }
    e.next();
}, "users");
