routerAdd("GET", "/api/ping", (c) => {
    return c.json(200, { pong: true, time: new Date().toISOString() });
});
