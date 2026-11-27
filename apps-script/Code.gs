/**
 * RP1 tracker backend (NAAC-X career)
 * Google Apps Script web app. Paste this whole file into the Apps Script editor.
 * The GitHub page talks only to this script; all career data lives in your Drive.
 *
 * Version: see VERSION below. Change log: CHANGELOG.md in the repo.
 */

const VERSION = '0.1.1';
const SHEET_NAME = 'NAAC-X Flight Log';
const FOLDERS = {
  root: '1VwmxHiCoadpn0zjuDwjrw8nJ9fYM5zHf',  // KSP RP1 › NAAC-X
  craft: '1xpeXQVrnqexcej_pJm6YqrkbSkm2Ml9a', // NAAC-X › Craft
  csv: '183IIkoqpkU--3oTqECMo0FuvLiGHbSjO',   // NAAC-X › CSV Export
};

// ---------------- sheet layout ----------------
// key: the ID column. json: columns stored as JSON text. Columns not listed here are added
// automatically (at the right-hand end) the first time the page saves a field with that name.
const STAGE_COLS = ['stage', 'enginePart', 'engineConfig', 'engineCount', 'ignitionStage', 'ignitions', 'residuals', 'duAtSave', 'propellant', 'pressurant', 'tank', 'engineCost', 'fins', 'separation', 'burn', 'isp', 'thrust', 'twr', 'dv', 'dryMass', 'fuelMass'];
const LV_COLS = ['name', 'family', 'versionOf', 'versions', 'status', 'builtIn', 'launchVehicle', 'stageLayout', 'nBoosters', 'size', 'dimensions', 'partCount', 'partCost', 'wetMass', 'dryMass', 'launchTwr', 'dvAsl', 'dvVac', 'payloadUnits', 'avionics', 'battery', 'antenna', 'experiments', 'sciShort', 'crew', 'craftFile', 'craftFileId', 'notes'];
const AC_COLS = ['name', 'family', 'versionOf', 'versions', 'span', 'length', 'height', 'wingArea', 'wings', 'controlSurfaces', 'gear', 'cockpit', 'lifeSupport', 'comms', 'intakes', 'totalFuel', 'partCount', 'partCost', 'wetMass', 'dryMass', 'twr', 'takeoffSpeed', 'maxMach', 'ceiling', 'range', 'science', 'craftFile', 'craftFileId', 'notes'];
const PROFILE = {
  Sounding: ['targetAlt', 'records'],
  Aircraft: ['takeoffSite', 'landingSite', 'carrier', 'maxMachAc', 'maxAltAc', 'flightTime', 'pilot', 'records'],
  'Suborbital crewed': ['crewNames', 'capsule', 'maxGProfile', 'splashdown', 'recoveryTime'],
  Orbital: ['tgtAp', 'tgtPe', 'tgtInc', 'ap', 'pe', 'inc', 'period', 'satellite', 'dvRemaining', 'orbitStatus'],
  'Orbital crewed': ['tgtAp', 'tgtPe', 'tgtInc', 'ap', 'pe', 'inc', 'period', 'satellite', 'dvRemaining', 'orbitStatus', 'crewNames', 'orbits', 'missionDuration', 'eva', 'docking', 'reentryG', 'landingPoint'],
  'Lunar uncrewed': ['lunarProfile', 'tliDate', 'transfer', 'lunarOrbit', 'landingSite', 'landingBiome', 'samples'],
  'Lunar crewed': ['lunarProfile', 'tliDate', 'transfer', 'lunarOrbit', 'landingSite', 'landingBiome', 'samples', 'crewNames'],
  Planetary: ['body', 'window', 'transfer', 'arrival', 'captureOrbit', 'landingSite', 'probeStatus'],
  Other: ['details'],
};

const SCHEMA = {
  Flights: { key: 'flightId', json: ['spacecraftIds', 'failures', 'src'], cols: ['flightId', 'launchId', 'mission', 'missionType', 'status', 'needsReview', 'launchDate', 'launchTime', 'launchUT', 'site', 'pad', 'builtIn', 'buildComplete', 'rollout', 'duration', 'recovery', 'vehicleId', 'vehicleName', 'spacecraftIds', 'maxAlt', 'maxAltT', 'maxVel', 'downrange', 'landLat', 'landLon', 'launchLat', 'launchLon', 'maxAp', 'maxG', 'maxMach', 'burnout', 'liftoffMass', 'launchTwr', 'tlmFile', 'tlmFileId', 'payloadUnits', 'payloadMass', 'science', 'crew', 'biome', 'contracts', 'notes', 'funds', 'rep', 'sci', 'conf', 'failures', 'syncFile', 'src', 'updatedAt'] },
  'Flight engines': { key: 'rowId', parent: 'flightId', json: ['src'], cols: ['rowId', 'flightId', 'stage', 'engine', 'propellant', 'duStart', 'duEnd', 'runTime', 'ignition', 'reliability', 'src'] },
  'Launch vehicles': { key: 'vehicleId', json: ['src'], cols: ['vehicleId'].concat(LV_COLS, ['src', 'updatedAt']) },
  Spacecraft: { key: 'vehicleId', json: ['src'], cols: ['vehicleId'].concat(LV_COLS, ['src', 'updatedAt']) },
  Aircraft: { key: 'vehicleId', json: ['src'], cols: ['vehicleId'].concat(AC_COLS, ['src', 'updatedAt']) },
  Stages: { key: 'rowId', parent: 'vehicleId', json: ['src'], cols: ['rowId', 'vehicleId'].concat(STAGE_COLS, ['src']) },
  'Aircraft engines': { key: 'rowId', parent: 'vehicleId', json: ['src'], cols: ['rowId', 'vehicleId', 'kind', 'part', 'config', 'count', 'propellant', 'duAtSave', 'thrust', 'src'] },
  'Aircraft tanks': { key: 'rowId', parent: 'vehicleId', json: ['src'], cols: ['rowId', 'vehicleId', 'part', 'type', 'volume', 'contents', 'src'] },
  'Spacecraft events': { key: 'rowId', parent: 'vehicleId', json: ['src'], cols: ['rowId', 'vehicleId', 'date', 'event', 'notes', 'src'] },
  Syncs: { key: 'syncId', json: ['lcs'], cols: ['syncId', 'at', 'file', 'title', 'ut', 'gameDate', 'funds', 'rep', 'sci', 'conf', 'confEarned', 'launchesInSave', 'newLaunches', 'lcs'] },
  'Sync engines': { key: 'rowId', parent: 'syncId', json: [], cols: ['rowId', 'syncId', 'engine', 'du', 't'] },
  Milestones: { key: 'milestoneId', json: [], cols: ['milestoneId', 'date', 'flightId', 'source', 'title', 'value', 'notes'] },
  Tech: { key: 'techId', json: [], cols: ['techId', 'node', 'cost', 'rate', 'ratio', 'efficiency', 'days', 'start', 'plannedEnd', 'actualEnd', 'slip', 'notes'] },
  Settings: { key: 'key', json: [], cols: ['key', 'value'] },
};
Object.keys(PROFILE).forEach(function (t) {
  SCHEMA['Profile - ' + t] = { key: 'flightId', json: [], cols: ['flightId'].concat(PROFILE[t]) };
});

// Columns kept as numbers in the Sheet. Everything else is stored as plain text, so the Sheet
// never turns dates, times, IDs or "75So" into something else.
const NUMERIC = ['launchUT', 'maxAlt', 'maxAltT', 'maxVel', 'downrange', 'landLat', 'landLon', 'launchLat', 'launchLon', 'maxAp', 'maxG', 'maxMach', 'burnout', 'liftoffMass', 'launchTwr', 'payloadMass', 'funds', 'rep', 'sci', 'conf', 'confEarned', 'duStart', 'duEnd', 'runTime', 'ignition', 'reliability', 'ut', 'launchesInSave', 'newLaunches', 'du', 't', 'cost', 'rate', 'ratio', 'efficiency', 'days', 'slip', 'engineCount', 'ignitions', 'engineCost', 'burn', 'isp', 'thrust', 'twr', 'dv', 'dryMass', 'fuelMass', 'wetMass', 'partCount', 'partCost', 'nBoosters', 'dvAsl', 'dvVac', 'count', 'volume', 'totalFuel', 'span', 'length', 'height', 'wingArea', 'takeoffSpeed', 'ceiling', 'range', 'targetAlt', 'maxMachAc', 'maxAltAc', 'maxGProfile', 'tgtAp', 'tgtPe', 'tgtInc', 'ap', 'pe', 'inc', 'dvRemaining', 'orbits', 'reentryG'];
const NUMSET = {};
NUMERIC.forEach(function (c) { NUMSET[c] = true; });

// ---------------- entry points ----------------
function doGet() {
  return json_({ ok: true, app: 'RP1 tracker backend', version: VERSION, note: 'Send requests with POST.' });
}

function doPost(e) {
  let req;
  try { req = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return json_({ ok: false, error: 'Request was not valid JSON.' }); }
  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty('API_KEY');
  if (!key) return json_({ ok: false, error: 'No key set yet. Run setup() in the Apps Script editor first.' });
  if (req.key !== key) return json_({ ok: false, error: 'Wrong key.', code: 'auth' });
  try { checkUser_(req.idToken, props); } catch (err) { return json_({ ok: false, error: err.message, code: 'signin' }); }
  try {
    const fn = ACTIONS[req.action];
    if (!fn) return json_({ ok: false, error: 'Unknown action: ' + req.action });
    const out = fn(req);
    out.ok = true; out.version = VERSION;
    return json_(out);
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

const ACTIONS = {
  ping: function () { const ss = sheet_(); return { sheetUrl: ss.getUrl(), tabs: ss.getSheets().map(function (s) { return s.getName(); }) }; },
  setup: function () { return ensureSheet_(); },
  read: function (req) { return { data: readTabs_(req.tabs) }; },
  write: function (req) { return writeOps_(req.ops || []); },
  listFiles: function (req) { return { files: listFiles_(req.folder) }; },
  readFile: function (req) { return readFile_(req.fileId); },
  uploadFile: function (req) { return uploadFile_(req.folder, req.name, req.text, req.ifExists); },
};

// Run this once from the editor (select "setup" and press Run). It creates the key and the Sheet.
function setup() {
  const props = PropertiesService.getScriptProperties();
  let key = props.getProperty('API_KEY');
  if (!key) { key = Utilities.getUuid().replace(/-/g, ''); props.setProperty('API_KEY', key); }
  if (!props.getProperty('ALLOWED_EMAIL')) props.setProperty('ALLOWED_EMAIL', Session.getEffectiveUser().getEmail().toLowerCase());
  const info = ensureSheet_();
  Logger.log('Your key (paste it into the page): ' + key);
  Logger.log('Google account allowed to sign in: ' + props.getProperty('ALLOWED_EMAIL'));
  Logger.log(props.getProperty('CLIENT_ID') ? 'Client ID is set.' : 'Client ID NOT set yet: add CLIENT_ID under Project Settings > Script properties.');
  Logger.log('Sheet: ' + info.sheetUrl);
  Logger.log('Tabs: ' + info.tabs.join(', '));
}

// Optional: run to make a new key (the old one stops working).
function newKey() {
  const key = Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('API_KEY', key);
  Logger.log('New key: ' + key);
}

// ---------------- Google sign-in check ----------------
// The page sends the Google ID token it got from "Sign in with Google". Google checks it is genuine;
// this script then checks it was issued to this site's Client ID and to the allowed account.
// A good token is remembered (by its hash) until it expires, so Google is asked once per sign-in.
function checkUser_(token, props) {
  const clientId = props.getProperty('CLIENT_ID');
  const allowed = props.getProperty('ALLOWED_EMAIL');
  if (!clientId) throw new Error('The script has no Client ID yet. Add CLIENT_ID under Project Settings > Script properties.');
  if (!allowed) throw new Error('Run setup() in the Apps Script editor first.');
  if (!token) throw new Error('Sign in with Google first.');
  const cache = CacheService.getScriptCache();
  const h = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token));
  if (cache.get('tok_' + h)) return;
  const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Your Google sign-in has expired. Sign in again.');
  const info = JSON.parse(res.getContentText());
  if (info.aud !== clientId) throw new Error('That sign-in was not made for this site.');
  if (String(info.email || '').toLowerCase() !== allowed) throw new Error('This Google account is not allowed.');
  if (!(info.email_verified === true || info.email_verified === 'true')) throw new Error('That Google account email is not verified.');
  const left = Number(info.exp) - Math.floor(Date.now() / 1000);
  if (!(left > 0)) throw new Error('Your Google sign-in has expired. Sign in again.');
  cache.put('tok_' + h, '1', Math.min(21600, left));
}

// ---------------- sheet helpers ----------------
function sheet_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SHEET_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (err) { /* deleted or moved to trash: make a new one */ } }
  const found = DriveApp.getFolderById(FOLDERS.root).getFilesByName(SHEET_NAME);
  let ss;
  if (found.hasNext()) ss = SpreadsheetApp.open(found.next());
  else {
    ss = SpreadsheetApp.create(SHEET_NAME);
    DriveApp.getFileById(ss.getId()).moveTo(DriveApp.getFolderById(FOLDERS.root));
  }
  props.setProperty('SHEET_ID', ss.getId());
  return ss;
}

function ensureSheet_() {
  const ss = sheet_();
  const made = [];
  Object.keys(SCHEMA).forEach(function (name) {
    let sh = ss.getSheetByName(name);
    if (!sh) { sh = ss.insertSheet(name); made.push(name); }
    ensureCols_(sh, SCHEMA[name].cols);
    sh.setFrozenRows(1);
  });
  const blank = ss.getSheetByName('Sheet1');
  if (blank && ss.getSheets().length > 1 && blank.getLastRow() === 0) ss.deleteSheet(blank);
  return { sheetUrl: ss.getUrl(), tabs: ss.getSheets().map(function (s) { return s.getName(); }), created: made };
}

function headers_(sh) {
  const w = sh.getLastColumn();
  if (!w) return [];
  return sh.getRange(1, 1, 1, w).getValues()[0].map(String);
}

// Adds any missing header columns at the right. Never removes or reorders columns.
function ensureCols_(sh, cols) {
  const have = headers_(sh);
  const add = cols.filter(function (c) { return have.indexOf(c) < 0; });
  if (!add.length) return have;
  const start = have.length + 1;
  if (sh.getMaxColumns() < have.length + add.length) sh.insertColumnsAfter(Math.max(1, sh.getMaxColumns()), have.length + add.length - sh.getMaxColumns());
  sh.getRange(1, start, 1, add.length).setValues([add]).setFontWeight('bold');
  add.forEach(function (c, i) { if (!NUMSET[c]) sh.getRange(2, start + i, Math.max(1, sh.getMaxRows() - 1), 1).setNumberFormat('@'); });
  return have.concat(add);
}

function tab_(ss, name) {
  if (!SCHEMA[name]) throw new Error('Unknown tab: ' + name);
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); ensureCols_(sh, SCHEMA[name].cols); sh.setFrozenRows(1); }
  return sh;
}

function cellOut_(v, col, def) {
  if (v === '' || v === null || v === undefined) return '';
  if (v instanceof Date) return Utilities.formatDate(v, 'UTC', "yyyy-MM-dd'T'HH:mm:ss'Z'");
  if (def.json.indexOf(col) >= 0) { try { return JSON.parse(v); } catch (err) { return v; } }
  if (col === 'needsReview') return v === true || v === 'TRUE' || v === 'true';
  return v;
}

function cellIn_(v, col, def) {
  if (v === undefined || v === null) return '';
  if (def.json.indexOf(col) >= 0) return typeof v === 'string' ? v : JSON.stringify(v);
  if (typeof v === 'object') return JSON.stringify(v);
  if (NUMSET[col]) { const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, '')); return v === '' || !isFinite(n) ? String(v) : n; }
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return String(v);
}

function readTabs_(tabs) {
  const ss = sheet_();
  const names = tabs && tabs.length ? tabs : Object.keys(SCHEMA);
  const out = {};
  names.forEach(function (name) {
    const def = SCHEMA[name];
    if (!def) throw new Error('Unknown tab: ' + name);
    const sh = ss.getSheetByName(name);
    if (!sh || sh.getLastRow() < 2) { out[name] = []; return; }
    const vals = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
    const head = vals[0].map(String);
    out[name] = vals.slice(1).filter(function (r) { return r.some(function (c) { return c !== ''; }); }).map(function (r) {
      const o = {};
      head.forEach(function (h, i) { if (h) { const v = cellOut_(r[i], h, def); if (v !== '') o[h] = v; } });
      return o;
    });
  });
  return out;
}

// ops: [{op:'upsert', tab, rows}, {op:'delete', tab, ids}, {op:'replaceChildren', tab, parentId, rows}]
// Runs all ops under one lock. Each tab is read once, changed in memory and written back once.
function writeOps_(ops) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = sheet_();
    const cache = {};
    const load = function (name) {
      if (cache[name]) return cache[name];
      const def = SCHEMA[name];
      const sh = tab_(ss, name);
      const head = headers_(sh);
      const rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, head.length).getValues() : [];
      cache[name] = { sh: sh, def: def, head: head, rows: rows, oldCount: rows.length, added: [] };
      return cache[name];
    };
    const need = function (t, obj) {
      Object.keys(obj).forEach(function (k) {
        if (k.charAt(0) === '_' && k !== '_src') return;
        const col = k === '_src' ? 'src' : k;
        if (t.head.indexOf(col) < 0) { t.head.push(col); t.added.push(col); t.rows.forEach(function (r) { r.push(''); }); }
      });
    };
    const toRow = function (t, obj, base) {
      const r = base ? base.slice() : t.head.map(function () { return ''; });
      Object.keys(obj).forEach(function (k) {
        if (k.charAt(0) === '_' && k !== '_src') return;
        const col = k === '_src' ? 'src' : k;
        r[t.head.indexOf(col)] = cellIn_(obj[k], col, t.def);
      });
      return r;
    };
    const summary = [];
    ops.forEach(function (op) {
      const t = load(op.tab);
      const ki = function () { return t.head.indexOf(t.def.key); };
      if (op.op === 'upsert') {
        let n = 0;
        (op.rows || []).forEach(function (obj) {
          if (!obj[t.def.key]) throw new Error(op.tab + ': every row needs ' + t.def.key);
          need(t, obj);
          const i = t.rows.findIndex(function (r) { return String(r[ki()]) === String(obj[t.def.key]); });
          if (i >= 0) t.rows[i] = toRow(t, obj, t.rows[i]); else t.rows.push(toRow(t, obj));
          n++;
        });
        summary.push(op.tab + ': ' + n + ' saved');
      } else if (op.op === 'delete') {
        const ids = (op.ids || []).map(String);
        const before = t.rows.length;
        t.rows = t.rows.filter(function (r) { return ids.indexOf(String(r[ki()])) < 0; });
        summary.push(op.tab + ': ' + (before - t.rows.length) + ' deleted');
      } else if (op.op === 'replaceChildren') {
        if (!t.def.parent) throw new Error(op.tab + ' has no parent column');
        const pi = t.head.indexOf(t.def.parent);
        t.rows = t.rows.filter(function (r) { return String(r[pi]) !== String(op.parentId); });
        (op.rows || []).forEach(function (obj, n) {
          const o = Object.assign({}, obj);
          o[t.def.parent] = op.parentId;
          if (!o[t.def.key]) o[t.def.key] = op.parentId + '#' + (n + 1);
          need(t, o);
          t.rows.push(toRow(t, o));
        });
        summary.push(op.tab + ': ' + (op.rows || []).length + ' rows for ' + op.parentId);
      } else throw new Error('Unknown op: ' + op.op);
    });
    const warnings = [];
    Object.keys(cache).forEach(function (name) {
      const t = cache[name];
      if (t.added.length) { ensureCols_(t.sh, t.head); warnings.push(name + ': new column(s) ' + t.added.join(', ')); }
      const w = t.head.length;
      if (t.oldCount > t.rows.length) t.sh.getRange(2 + t.rows.length, 1, t.oldCount - t.rows.length, w).clearContent();
      if (t.rows.length) {
        if (t.sh.getMaxRows() < t.rows.length + 1) t.sh.insertRowsAfter(t.sh.getMaxRows(), t.rows.length + 1 - t.sh.getMaxRows());
        t.sh.getRange(2, 1, t.rows.length, w).setValues(t.rows);
      }
    });
    SpreadsheetApp.flush();
    return { summary: summary, warnings: warnings };
  } finally {
    lock.releaseLock();
  }
}

// ---------------- Drive files ----------------
function folder_(name) {
  const id = FOLDERS[name];
  if (!id || name === 'root') throw new Error('Unknown folder: ' + name + ' (use craft or csv)');
  return DriveApp.getFolderById(id);
}

function listFiles_(name) {
  const it = folder_(name).getFiles();
  const out = [];
  while (it.hasNext()) {
    const f = it.next();
    out.push({ id: f.getId(), name: f.getName(), modified: f.getLastUpdated().toISOString(), size: f.getSize() });
  }
  out.sort(function (a, b) { return a.modified < b.modified ? 1 : -1; });
  return out;
}

// Only files inside NAAC-X › Craft or CSV Export can be read.
function readFile_(fileId) {
  const f = DriveApp.getFileById(fileId);
  const parents = f.getParents();
  let okay = false;
  while (parents.hasNext()) { const p = parents.next().getId(); if (p === FOLDERS.craft || p === FOLDERS.csv) okay = true; }
  if (!okay) throw new Error('That file is not in the Craft or CSV Export folder.');
  return { id: f.getId(), name: f.getName(), modified: f.getLastUpdated().toISOString(), text: f.getBlob().getDataAsString('UTF-8') };
}

// ifExists: 'reuse' (default: keep the file already there if it has the same name and size),
// 'replace' (overwrite its content) or 'rename' (add " (2)" etc.).
function uploadFile_(name, fileName, text, ifExists) {
  if (!fileName || typeof text !== 'string') throw new Error('uploadFile needs a name and text');
  const dir = folder_(name);
  const same = dir.getFilesByName(fileName);
  if (same.hasNext()) {
    const f = same.next();
    const mode = ifExists || 'reuse';
    const bytes = Utilities.newBlob(text).getBytes().length;
    if (mode === 'reuse' && f.getSize() === bytes) return { id: f.getId(), name: f.getName(), status: 'already in Drive' };
    if (mode === 'replace') { f.setContent(text); return { id: f.getId(), name: f.getName(), status: 'replaced' }; }
    let n = 2; let alt;
    const dot = fileName.lastIndexOf('.');
    do { alt = dot > 0 ? fileName.slice(0, dot) + ' (' + n + ')' + fileName.slice(dot) : fileName + ' (' + n + ')'; n++; } while (dir.getFilesByName(alt).hasNext());
    const g = dir.createFile(alt, text, 'text/plain');
    return { id: g.getId(), name: g.getName(), status: 'saved under a new name' };
  }
  const g = dir.createFile(fileName, text, 'text/plain');
  return { id: g.getId(), name: g.getName(), status: 'saved' };
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
