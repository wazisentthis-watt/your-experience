/* WIR Y.O.U.R. sprite registry v1 | PROPOSAL_HOLD.
 * Opt-in adapter for existing YOUR.core.assets and YOUR.SpriteSheet.
 * No automatic load, main-game hooks, asset changes or save writes. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.WIRSpriteRegistry = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  var ID = /^[a-z][a-z0-9_-]*$/;
  var ACTION = /^[a-z][a-z0-9_]*$/;
  var SHA = /^[a-f0-9]{64}$/;
  var GIT_SHA = /^[a-f0-9]{40}$/;
  function fail(message) { throw new Error('WIR sprite registry: ' + message); }
  function positiveInt(n) { return Number.isSafeInteger(n) && n > 0; }
  function localPath(path) {
    return typeof path === 'string' && /^your\/assets\/[A-Za-z0-9_./-]+\.(png|webp)$/.test(path) &&
      path.indexOf('..') < 0 && path.indexOf('//') < 0 && !path.includes('/./');
  }
  function validate(manifest) {
    if (!manifest || manifest.schema !== 'wir.sprite-registry/1' || !Array.isArray(manifest.assets)) fail('invalid manifest schema');
    if (manifest.status !== 'PROPOSAL_HOLD') fail('manifest must be PROPOSAL_HOLD');
    var ids = new Set(), hashes = new Set();
    manifest.assets.forEach(function (a) {
      if (!a || !ID.test(a.id || '') || ids.has(a.id)) fail('missing or duplicate asset id');
      ids.add(a.id);
      if (!localPath(a.path)) fail('unsafe asset path: ' + a.id);
      if (a.source_kind !== 'ORIGINAL_WIR' && a.source_kind !== 'UNVERIFIED') fail('unknown source kind: ' + a.id);
      if (a.rights_status !== 'NEEDS_REVIEW' && a.rights_status !== 'APPROVED_ORIGINAL_WIR') fail('invalid rights status: ' + a.id);
      if (a.geometry_status !== 'NEEDS_REVIEW' && a.geometry_status !== 'VERIFIED') fail('invalid geometry status: ' + a.id);
      if (!a.provenance || typeof a.provenance !== 'string') fail('missing provenance: ' + a.id);
      if (a.git_blob_sha && !GIT_SHA.test(a.git_blob_sha)) fail('invalid Git blob SHA: ' + a.id);
      if (a.sha256 !== null && a.sha256 !== undefined) {
        if (typeof a.sha256 !== 'string' || !SHA.test(a.sha256)) fail('invalid SHA-256: ' + a.id);
        if (hashes.has(a.sha256)) fail('duplicate SHA-256: ' + a.id);
        hashes.add(a.sha256);
      }
      if (!positiveInt(a.cols) || !positiveInt(a.rows) || !positiveInt(a.frameW) || !positiveInt(a.frameH)) fail('invalid frame geometry: ' + a.id);
      if (a.cols * a.rows > 8192 || a.cols * a.frameW > 16384 || a.rows * a.frameH > 16384) fail('unreasonable atlas size: ' + a.id);
      if (!Number.isFinite(a.fps) || a.fps <= 0 || a.fps > 60) fail('invalid fps: ' + a.id);
      if (!a.anims || typeof a.anims !== 'object' || Array.isArray(a.anims) || !Object.keys(a.anims).length) fail('no animations: ' + a.id);
      Object.keys(a.anims).forEach(function (key) {
        var frames = a.anims[key];
        if (!ACTION.test(key) || !Array.isArray(frames) || !frames.length || frames.length > 64) fail('bad animation: ' + a.id + '/' + key);
        frames.forEach(function (frame) {
          if (!Number.isSafeInteger(frame) || frame < 0 || frame >= a.cols * a.rows) fail('out-of-bounds frame: ' + a.id + '/' + key);
        });
      });
      if (a.rights_status === 'APPROVED_ORIGINAL_WIR' && (a.source_kind !== 'ORIGINAL_WIR' || !a.sha256)) fail('approved entry must have ORIGINAL_WIR provenance and SHA-256: ' + a.id);
    });
    return true;
  }
  function find(manifest, id) {
    validate(manifest);
    var match = manifest.assets.find(function (a) { return a.id === id; });
    if (!match) fail('unknown asset: ' + id);
    return match;
  }
  function isReady(a) {
    return a.source_kind === 'ORIGINAL_WIR' && a.rights_status === 'APPROVED_ORIGINAL_WIR' &&
      a.geometry_status === 'VERIFIED' && typeof a.sha256 === 'string' && SHA.test(a.sha256);
  }
  function preflight(manifest) {
    validate(manifest);
    return manifest.assets.map(function (a) {
      return { id: a.id, path: a.path, ready: isReady(a), reason: isReady(a) ? 'ready for explicit loading' : 'rights/geometry/provenance review required' };
    });
  }
  function loadSheet(manifest, id, Y) {
    var asset = find(manifest, id);
    if (!isReady(asset)) return Promise.reject(new Error('WIR sprite registry: HOLD, asset not approved: ' + id));
    if (!Y || !Y.core || !Y.core.assets || typeof Y.core.assets.load !== 'function' ||
        typeof Y.core.assets.get !== 'function' || typeof Y.SpriteSheet !== 'function') {
      return Promise.reject(new Error('WIR sprite registry: YOUR engine adapter unavailable'));
    }
    var mapping = {}; mapping[id] = asset.path;
    return Y.core.assets.load(mapping).then(function () {
      var img = Y.core.assets.get(id);
      if (!img || img.width !== asset.cols * asset.frameW || img.height !== asset.rows * asset.frameH) {
        fail('image missing or atlas dimensions mismatch: ' + id);
      }
      var anims = {};
      Object.keys(asset.anims).forEach(function (key) { anims[key] = { frames: asset.anims[key].slice() }; });
      return new Y.SpriteSheet({ img: img, cols: asset.cols, rows: asset.rows, frameW: asset.frameW,
        frameH: asset.frameH, anims: anims, fps: asset.fps, label: id });
    });
  }
  return Object.freeze({ validate: validate, find: find, preflight: preflight, loadSheet: loadSheet });
});
