// appwrite.js — Appwrite cloud database layer
// Exports the same function signatures as schema.js so the rest of the app
// works identically whether using local IndexedDB or cloud.

import { Client, Databases, ID, Query } from 'appwrite';

// ─── Config ──────────────────────────────────────────────────────────────────

const CFG_KEYS = {
  endpoint:   'cargodesk_aw_endpoint',
  projectId:  'cargodesk_aw_project',
  databaseId: 'cargodesk_aw_database',
};

// Pre-filled with Oscar's Appwrite project
const DEFAULTS = {
  endpoint:   'https://fra.cloud.appwrite.io/v1',
  projectId:  '69ddec6f0027dd4d58a2',
  databaseId: '69ddf5d500320ffd383d',
};

export function getAppwriteConfig() {
  try {
    return {
      endpoint:   localStorage.getItem(CFG_KEYS.endpoint)   || DEFAULTS.endpoint,
      projectId:  localStorage.getItem(CFG_KEYS.projectId)  || DEFAULTS.projectId,
      databaseId: localStorage.getItem(CFG_KEYS.databaseId) || DEFAULTS.databaseId,
    };
  } catch { return { ...DEFAULTS }; }
}

export function setAppwriteConfig({ endpoint, projectId, databaseId }) {
  try {
    if (endpoint)   localStorage.setItem(CFG_KEYS.endpoint,   endpoint);
    if (projectId)  localStorage.setItem(CFG_KEYS.projectId,  projectId);
    if (databaseId) localStorage.setItem(CFG_KEYS.databaseId, databaseId);
  } catch {}
}

// ─── Cloud mode toggle ────────────────────────────────────────────────────────

const SOURCE_KEY = 'cargodesk_db_source';
export function getDbSource() {
  try { return localStorage.getItem(SOURCE_KEY) || 'local'; } catch { return 'local'; }
}
export function setDbSource(source) {
  try { localStorage.setItem(SOURCE_KEY, source); } catch {}
}

// ─── Appwrite client (lazy init) ─────────────────────────────────────────────

let _client = null;
let _db     = null;

function getClient() {
  const cfg = getAppwriteConfig();
  // Reinitialise if config changed
  if (!_client) {
    _client = new Client().setEndpoint(cfg.endpoint).setProject(cfg.projectId);
    _db = new Databases(_client);
  }
  return { client: _client, db: _db, cfg };
}

export function resetClient() { _client = null; _db = null; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COLLECTIONS = {
  shipments:  'shipments',
  projects:   'projects',
  activities: 'activities',
  templates:  'templates',
  documents:  'documents',
  quotes:     'quotes',
};

/** Fetch ALL documents across pages (Appwrite default limit is 25) */
async function listAll(collectionId, queries = []) {
  const { db, cfg } = getClient();
  const PAGE = 100;
  let all = [];
  let cursor = null;

  while (true) {
    const q = [...queries, Query.limit(PAGE)];
    if (cursor) q.push(Query.cursorAfter(cursor));

    const res = await db.listDocuments(cfg.databaseId, collectionId, q);
    all = [...all, ...res.documents];

    if (res.documents.length < PAGE) break;
    cursor = res.documents[res.documents.length - 1].$id;
  }
  return all;
}

function safeJson(str, fallback = {}) {
  try { return JSON.parse(str || '{}'); } catch { return fallback; }
}

// ─── Shipment serialisation ───────────────────────────────────────────────────

function shipmentToDoc(s) {
  // Separate indexed top-level fields from everything else
  const top = {
    ref:         s.ref         || '',
    projectId:   s.projectId   || '',
    status:      s.status      || 'planned',
    origin:      s.origin      || '',
    destination: s.destination || '',
    carrier:     s.carrier     || '',
    etd:         s.etd         || '',
    eta:         s.eta         || '',
  };

  // Everything else goes into dataJson — strip top-level keys and id
  const excluded = new Set(['ref','projectId','status','origin','destination','carrier','etd','eta','id','updatedAt']);
  const rest = {};
  for (const [k, v] of Object.entries(s)) {
    if (!excluded.has(k) && v !== undefined) rest[k] = v;
  }

  const json = JSON.stringify(rest);
  // Appwrite string limit is 10000 chars — truncate milestones if needed
  if (json.length > 9800) {
    // Keep costs, trim milestones to last 20
    const slim = { ...rest };
    if (Array.isArray(slim.milestones) && slim.milestones.length > 20) {
      slim.milestones = slim.milestones.slice(-20);
    }
    top.dataJson = JSON.stringify(slim).slice(0, 9800);
  } else {
    top.dataJson = json;
  }

  return top;
}

function docToShipment(doc) {
  const data = safeJson(doc.dataJson);
  return {
    id:          doc.$id,
    ref:         doc.ref         || null,
    projectId:   doc.projectId   || null,
    status:      doc.status      || 'planned',
    origin:      doc.origin      || '',
    destination: doc.destination || '',
    carrier:     doc.carrier     || '',
    etd:         doc.etd         || null,
    eta:         doc.eta         || null,
    updatedAt:   doc.$updatedAt,
    ...data,
  };
}

// ─── Project serialisation ────────────────────────────────────────────────────

function projectToDoc(p) {
  return {
    name:     p.name     || '',
    customer: p.customer || '',
    status:   p.status   || 'active',
    colorId:  p.colorId  || '',
  };
}

function docToProject(doc) {
  return {
    id:       doc.$id,
    name:     doc.name,
    customer: doc.customer || '',
    status:   doc.status   || 'active',
    colorId:  doc.colorId  || '',
  };
}

// ─── Activity serialisation ───────────────────────────────────────────────────

function activityToDoc(a) {
  return {
    shipmentId: a.shipmentId || '',
    type:       a.type       || 'note',
    message:    (a.message   || '').slice(0, 499),
    timestamp:  a.timestamp  || new Date().toISOString(),
  };
}

function docToActivity(doc) {
  return {
    id:         doc.$id,
    shipmentId: doc.shipmentId || null,
    type:       doc.type,
    message:    doc.message,
    timestamp:  doc.timestamp,
  };
}

// ─── Template serialisation ───────────────────────────────────────────────────

function templateToDoc(t) {
  const { id, name, mode, origin, destination, ...rest } = t;
  return {
    name:        name        || '',
    mode:        mode        || 'ocean',
    origin:      origin      || '',
    destination: destination || '',
    dataJson:    JSON.stringify(rest),
  };
}

function docToTemplate(doc) {
  const data = safeJson(doc.dataJson);
  return {
    id:          doc.$id,
    name:        doc.name,
    mode:        doc.mode        || 'ocean',
    origin:      doc.origin      || '',
    destination: doc.destination || '',
    ...data,
  };
}

// ─── Document serialisation ───────────────────────────────────────────────────

function documentToDoc(d) {
  const { id, shipmentId, name, type, date, ...rest } = d;
  // Strip large fields that would exceed the 5000 char dataJson limit
  const { base64Data, rawText, parsedData, text, ...safeRest } = rest;
  const json = JSON.stringify(safeRest);
  // Safety: truncate if somehow still too long
  return {
    shipmentId: shipmentId || '',
    name:       name       || '',
    type:       type       || 'document',
    date:       date       || '',
    dataJson:   json.length > 4800 ? json.slice(0, 4800) : json,
  };
}

function docToDocument(doc) {
  const data = safeJson(doc.dataJson);
  return {
    id:         doc.$id,
    shipmentId: doc.shipmentId,
    name:       doc.name,
    type:       doc.type,
    date:       doc.date,
    ...data,
  };
}

// ─── Quote serialisation ──────────────────────────────────────────────────────

function quoteToDoc(q) {
  const { id, shipmentId, carrier, origin, destination, validUntil, createdAt, ...rest } = q;
  return {
    shipmentId:  shipmentId  || '',
    carrier:     carrier     || '',
    origin:      origin      || '',
    destination: destination || '',
    validUntil:  validUntil  || '',
    createdAt:   createdAt   || new Date().toISOString(),
    dataJson:    JSON.stringify(rest),
  };
}

function docToQuote(doc) {
  const data = safeJson(doc.dataJson);
  return {
    id:          doc.$id,
    shipmentId:  doc.shipmentId  || null,
    carrier:     doc.carrier     || '',
    origin:      doc.origin      || '',
    destination: doc.destination || '',
    validUntil:  doc.validUntil  || null,
    createdAt:   doc.createdAt,
    ...data,
  };
}

// ─── SHIPMENTS ────────────────────────────────────────────────────────────────

export async function getShipments() {
  const docs = await listAll(COLLECTIONS.shipments);
  return docs.map(docToShipment);
}

export async function getShipment(id) {
  const { db, cfg } = getClient();
  try {
    const doc = await db.getDocument(cfg.databaseId, COLLECTIONS.shipments, id);
    return docToShipment(doc);
  } catch { return null; }
}

export async function addShipment(shipment) {
  const { db, cfg } = getClient();
  const docId = shipment.id || ID.unique();
  await db.createDocument(cfg.databaseId, COLLECTIONS.shipments, docId, shipmentToDoc(shipment));
  return docId;
}

export async function updateShipment(id, changes) {
  const { db, cfg } = getClient();
  // Get existing to merge dataJson correctly
  const existing = await getShipment(id);
  if (!existing) return;
  const merged = { ...existing, ...changes, id };
  await db.updateDocument(cfg.databaseId, COLLECTIONS.shipments, id, shipmentToDoc(merged));
}

export async function deleteShipment(id) {
  const { db, cfg } = getClient();
  try {
    await db.deleteDocument(cfg.databaseId, COLLECTIONS.shipments, id);
    // Also delete related documents and activities
    const docs = await listAll(COLLECTIONS.documents,  [Query.equal('shipmentId', id)]);
    const acts = await listAll(COLLECTIONS.activities, [Query.equal('shipmentId', id)]);
    for (const d of docs) await db.deleteDocument(cfg.databaseId, COLLECTIONS.documents,  d.$id);
    for (const a of acts) await db.deleteDocument(cfg.databaseId, COLLECTIONS.activities, a.$id);
  } catch (e) { console.error('deleteShipment', e); }
}

export async function getNextRef() {
  const all = await getShipments();
  const year = new Date().getFullYear().toString().slice(2);
  let maxNum = 0;
  all.forEach(s => {
    const match = (s.ref || '').match(/^S(\d{2})(\d+)$/);
    if (match && match[1] === year) {
      const num = parseInt(match[2], 10);
      if (num > maxNum) maxNum = num;
    }
  });
  return `S${year}${(maxNum + 1).toString().padStart(8, '0')}`;
}

export async function toggleMilestone(shipmentId, milestoneId) {
  const s = await getShipment(shipmentId);
  if (!s) return;
  const milestones = (s.milestones || []).map(m =>
    m.id === milestoneId ? { ...m, done: !m.done } : m
  );
  await updateShipment(shipmentId, { milestones });
}

// ─── PROJECTS ─────────────────────────────────────────────────────────────────

export async function getProjects() {
  const docs = await listAll(COLLECTIONS.projects);
  return docs.map(docToProject);
}

export async function addProject(project) {
  const { db, cfg } = getClient();
  const docId = project.id || ID.unique();
  await db.createDocument(cfg.databaseId, COLLECTIONS.projects, docId, projectToDoc(project));
  return docId;
}

export async function updateProject(id, changes) {
  const { db, cfg } = getClient();
  const existing = await db.getDocument(cfg.databaseId, COLLECTIONS.projects, id);
  const merged = { ...docToProject(existing), ...changes };
  await db.updateDocument(cfg.databaseId, COLLECTIONS.projects, id, projectToDoc(merged));
}

export async function deleteProject(id) {
  const { db, cfg } = getClient();
  try { await db.deleteDocument(cfg.databaseId, COLLECTIONS.projects, id); } catch {}
}

// ─── ACTIVITIES ───────────────────────────────────────────────────────────────

export async function addActivity(activity) {
  const { db, cfg } = getClient();
  const docId = activity.id || ID.unique();
  await db.createDocument(cfg.databaseId, COLLECTIONS.activities, docId, activityToDoc(activity));
}

export async function getActivities(limit = 50) {
  const docs = await listAll(COLLECTIONS.activities, [
    Query.orderDesc('timestamp'),
    Query.limit(limit),
  ]);
  return docs.map(docToActivity);
}

export async function getShipmentActivities(shipmentId) {
  const docs = await listAll(COLLECTIONS.activities, [Query.equal('shipmentId', shipmentId)]);
  return docs.map(docToActivity);
}

// ─── TEMPLATES ────────────────────────────────────────────────────────────────

export async function getTemplates() {
  const docs = await listAll(COLLECTIONS.templates);
  return docs.map(docToTemplate);
}

export async function addTemplate(template) {
  const { db, cfg } = getClient();
  const docId = template.id || ID.unique();
  await db.createDocument(cfg.databaseId, COLLECTIONS.templates, docId, templateToDoc(template));
}

export async function deleteTemplate(id) {
  const { db, cfg } = getClient();
  try { await db.deleteDocument(cfg.databaseId, COLLECTIONS.templates, id); } catch {}
}

// ─── DOCUMENTS ────────────────────────────────────────────────────────────────

export async function getDocuments(shipmentId) {
  const docs = await listAll(COLLECTIONS.documents, [Query.equal('shipmentId', shipmentId)]);
  return docs.map(docToDocument);
}

export async function getAllDocuments() {
  const docs = await listAll(COLLECTIONS.documents);
  return docs.map(docToDocument);
}

export async function addDocument(doc) {
  const { db, cfg } = getClient();
  const docId = doc.id || ID.unique();
  await db.createDocument(cfg.databaseId, COLLECTIONS.documents, docId, documentToDoc(doc));
}

export async function deleteDocument(id) {
  const { db, cfg } = getClient();
  try { await db.deleteDocument(cfg.databaseId, COLLECTIONS.documents, id); } catch {}
}

// ─── QUOTES ───────────────────────────────────────────────────────────────────

export async function getQuotes() {
  const docs = await listAll(COLLECTIONS.quotes);
  return docs.map(docToQuote);
}

export async function addQuote(quote) {
  const { db, cfg } = getClient();
  const docId = quote.id || ID.unique();
  await db.createDocument(cfg.databaseId, COLLECTIONS.quotes, docId, quoteToDoc(quote));
}

export async function deleteQuote(id) {
  const { db, cfg } = getClient();
  try { await db.deleteDocument(cfg.databaseId, COLLECTIONS.quotes, id); } catch {}
}

// ─── Connection test ──────────────────────────────────────────────────────────

export async function testConnection() {
  try {
    const { db, cfg } = getClient();
    await db.listDocuments(cfg.databaseId, COLLECTIONS.shipments, [Query.limit(1)]);
    return { ok: true, message: 'Connected to Appwrite successfully.' };
  } catch (err) {
    return { ok: false, message: `Connection failed: ${err.message}` };
  }
}

// ─── Migration: local IndexedDB → Appwrite ────────────────────────────────────

export async function migrateFromLocal(localData) {
  const { db, cfg } = getClient();
  const results = { shipments: 0, projects: 0, activities: 0, templates: 0, quotes: 0, errors: [] };

  async function upsert(collection, docId, data) {
    try {
      await db.createDocument(cfg.databaseId, collection, docId, data);
    } catch (e) {
      if (e.code === 409) {
        // Already exists — update it
        try {
          await db.updateDocument(cfg.databaseId, collection, docId, data);
        } catch (e2) {
          results.errors.push(`${collection}/${docId}: update failed — ${e2.message}`);
        }
      } else {
        results.errors.push(`${collection}/${docId}: create failed — ${e.message}`);
        console.error(`Migration error ${collection}/${docId}:`, e);
      }
    }
  }

  for (const p of (localData.projects || [])) {
    await upsert(COLLECTIONS.projects, p.id, projectToDoc(p));
    results.projects++;
  }

  for (const s of (localData.shipments || [])) {
    try {
      const doc = shipmentToDoc(s);
      await upsert(COLLECTIONS.shipments, s.id, doc);
      results.shipments++;
    } catch (e) {
      results.errors.push(`shipments/${s.id}: serialise failed — ${e.message}`);
      console.error(`Shipment serialise error ${s.id}:`, e);
    }
  }

  for (const a of (localData.activities || [])) {
    await upsert(COLLECTIONS.activities, a.id, activityToDoc(a));
    results.activities++;
  }

  for (const t of (localData.templates || [])) {
    await upsert(COLLECTIONS.templates, t.id, templateToDoc(t));
    results.templates++;
  }

  for (const q of (localData.quotes || [])) {
    await upsert(COLLECTIONS.quotes, q.id, quoteToDoc(q));
    results.quotes++;
  }

  return results;
}
