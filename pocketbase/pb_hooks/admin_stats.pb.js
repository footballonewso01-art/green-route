routerAdd('GET', '/api/admin/users/{id}/stats', (c) => {
    c.response.header().set('Cache-Control', 'private, no-store');
    try {
        var service = require(__hooks + '/stats_adjustments.js');
        return c.json(200, service.list($app, service.authorize($app, c)));
    } catch (error) {
        if (!error.status) $app.logger().error('Admin stats read failed: ' + error);
        return c.json(error.status || 500, { message: error.status ? error.message : 'Statistics could not be loaded.' });
    }
});
routerAdd('POST', '/api/admin/users/{id}/stats/preview', (c) => {
    c.response.header().set('Cache-Control', 'private, no-store');
    try {
        var service = require(__hooks + '/stats_adjustments.js');
        var userId = service.authorize($app, c);
        var body = new DynamicModel({ mode: '', resourceId: '', start: '', end: '', total: 0, uniquePercent: 80, countries: '', reason: '' });
        c.bindBody(body);
        return c.json(200, service.preview($app, userId, c.auth.id, body));
    } catch (error) {
        if (!error.status) $app.logger().error('Admin stats preview failed: ' + error);
        return c.json(error.status || 500, { message: error.status ? error.message : 'Preview could not be generated. No statistics were changed.' });
    }
});
routerAdd('POST', '/api/admin/users/{id}/stats/{adjustmentId}/apply', (c) => {
    c.response.header().set('Cache-Control', 'private, no-store');
    try {
        var service = require(__hooks + '/stats_adjustments.js');
        return c.json(200, service.change($app, service.authorize($app, c), c.auth.id, String(c.request.pathValue('adjustmentId')), false));
    } catch (error) {
        if (!error.status) $app.logger().error('Admin stats apply failed: ' + error);
        return c.json(error.status || 500, { message: error.status ? error.message : 'Adjustment could not be applied. Refresh the history before retrying.' });
    }
});
routerAdd('POST', '/api/admin/users/{id}/stats/{adjustmentId}/undo', (c) => {
    c.response.header().set('Cache-Control', 'private, no-store');
    try {
        var service = require(__hooks + '/stats_adjustments.js');
        return c.json(200, service.change($app, service.authorize($app, c), c.auth.id, String(c.request.pathValue('adjustmentId')), true));
    } catch (error) {
        if (!error.status) $app.logger().error('Admin stats undo failed: ' + error);
        return c.json(error.status || 500, { message: error.status ? error.message : 'Adjustment could not be undone. Refresh the history before retrying.' });
    }
});
