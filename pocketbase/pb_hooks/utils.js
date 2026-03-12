module.exports = {
    stripeRequest: function(method, endpoint, data) {
        const STRIPE_SECRET_KEY = $os.getenv("STRIPE_SECRET_KEY");
        let url = "https://api.stripe.com/v1" + endpoint;
        let body = null;
        let headers = {
            "Authorization": "Bearer " + STRIPE_SECRET_KEY,
            "Content-Type": "application/x-www-form-urlencoded"
        };
        if (data) {
            const parts = [];
            for (const key in data) {
                if (typeof data[key] === 'object' && data[key] !== null) {
                    for (const subKey in data[key]) {
                        parts.push(encodeURIComponent(key + "[" + subKey + "]") + "=" + encodeURIComponent(data[key][subKey]));
                    }
                } else {
                    parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(data[key]));
                }
            }
            body = parts.join("&");
            if (method === "GET") {
                url += "?" + body;
                body = null;
            }
        }
        try {
            const res = $http.send({
                url: url,
                method: method,
                body: body,
                headers: headers,
                timeout: 10
            });
            if (res.statusCode >= 400) {
                throw new Error("Stripe Error " + res.statusCode + ": " + res.raw);
            }
            return res.json;
        } catch (err) {
            throw err;
        }
    }
};
