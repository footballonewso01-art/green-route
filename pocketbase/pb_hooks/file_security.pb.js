// Defense in depth for legacy files already in storage. New uploads are
// raster-only; an old SVG must never execute scripts on the PocketBase origin.
onFileDownloadRequest((e) => {
    // PB 0.24 exposes the embedded router event explicitly on file hooks.
    const requestEvent = e.requestEvent || e;
    requestEvent.response.header().set("X-Content-Type-Options", "nosniff");
    requestEvent.response.header().set("Content-Security-Policy", "sandbox; default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
    if (/\.(?:svg|svgz|html?|xhtml|xml)$/i.test(String(e.servedName || ""))) {
        requestEvent.response.header().set("Content-Disposition", "attachment");
    }
    return e.next();
});
