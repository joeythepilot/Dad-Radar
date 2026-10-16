'use strict';
const path = require('node:path');
const manifest = require('../assets/mobile-optimized/manifest.json');
const projectRoot = path.join(__dirname, '..');

function artworkDelivery(request, response, next) {
  if (!['GET','HEAD'].includes(request.method)) return next();
  const entry = manifest.entries[request.path];
  if (!entry) return next();
  response.vary('Accept');
  // */* alone is not a declaration of WebP support. Respect explicit q=0 too.
  if (!/(?:^|,)\s*image\/webp\s*(?:;|,|$)/i.test(request.get('Accept') || '') || !request.accepts('image/webp')) return next();
  response.sendFile(path.join(projectRoot, entry.file), error => {
    if (!error) return;
    if (response.headersSent) return next(error);
    // A missing optional delivery copy must leave the approved PNG available.
    if (error.code === 'ENOENT' || error.status === 404) return next();
    next(error);
  });
}
module.exports = {artworkDelivery};
