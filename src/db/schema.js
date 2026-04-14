import Dexie from 'dexie';
import * as cloud from './appwrite.js';

// ─── Mode (test / production) ─────────────────────────────────────────────────
const MODE_KEY = 'cargodesk_mode';
export function getMode() { try { return localStorage.getItem(MODE_KEY) || 'test'; } catch { return 'test'; } }
export function setMode(mode) { try { localStorage.setItem(MODE_KEY, mode); } catch {} }

// ─── Data source (local / cloud) ──────────────────────────────────────────────
export function getDbSource() { return cloud.getDbSource(); }
export function setDbSource(s) { cloud.setDbSource(s); }
function isCloud() { return cloud.getDbSource() === 'cloud'; }

// ─── Local IndexedDB setup ────────────────────────────────────────────────────

function createDB(name) {
  const db = new Dexie(name);
  db.version(3).stores({
    projects:  'id, name, customer, status',
    shipments: 'id, ref, projectId, customerRef, mode, status, origin, destination, carrier, etd, eta, updatedAt',
    documents: 'id, shipmentId, name, type, date, quoteNumber, bookingNumber',
    activities:'id, shipmentId, type, timestamp',
    templates: 'id, name, mode',
  });
  db.version(4).stores({
    projects:  'id, name, customer, status',
    shipments: 'id, ref, projectId, customerRef, mode, status, origin, destination, carrier, etd, eta, updatedAt',
    documents: 'id, shipmentId, name, type, date, quoteNumber, bookingNumber',
    activities:'id, shipmentId, type, timestamp',
    templates: 'id, name, mode',
    quotes:    'id, shipmentId, carrier, origin, destination, createdAt, validUntil',
  });
  return db;
}

const databases = {
  production: createDB('CargoDesk'),
  test:       createDB('CargoDesk_test'),
};

export function getDB() { return databases[getMode()] || databases.test; }

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED_PROJECTS = [
  { id: "p1", name: "USGOLD",   customer: "US Gold Mining Corp",   status: "active", colorId: "blue"    },
  { id: "p2", name: "NORDPULP", customer: "Nordic Pulp & Paper",   status: "active", colorId: "emerald" },
];

const SEED_SHIPMENTS = [
  { id:"s1",ref:"S2600000123",projectId:"p1",customerRef:"USGOLD 1",mode:"ocean",status:"in_transit",origin:"Helsinki, FI",destination:"Houston, US",vessel:"MSC Irina",voyage:"AE325W",carrier:"MSC",routing:"Helsinki → Rotterdam → Houston",etd:"2026-03-15",eta:"2026-04-18",containerType:"2 x 40'HC",updatedAt:new Date().toISOString(),
    milestones:[{id:"m1",label:"Cargo Ready",date:"2026-03-10",done:true},{id:"m2",label:"S/I Cut-off",date:"2026-03-12",done:true},{id:"m3",label:"VGM Cut-off",date:"2026-03-13",done:true},{id:"m4",label:"ETD Helsinki",date:"2026-03-15",done:true},{id:"m5",label:"Transhipment Rotterdam",date:"2026-03-22",done:true},{id:"m6",label:"ETA Houston",date:"2026-04-18",done:false},{id:"m7",label:"Customs Clearance",date:"2026-04-20",done:false},{id:"m8",label:"Delivered",date:"2026-04-22",done:false}],
    costs:{quoted:14200,items:[{id:"c1",category:"origin",desc:"Pickup + stuffing",amount:1800,currency:"EUR"},{id:"c2",category:"transport",desc:"Ocean freight (MSC)",amount:9200,currency:"EUR"},{id:"c3",category:"origin",desc:"THC Helsinki",amount:450,currency:"EUR"},{id:"c4",category:"destination",desc:"THC Houston",amount:680,currency:"USD"},{id:"c5",category:"destination",desc:"Customs brokerage",amount:350,currency:"USD"}],running:[]},notes:[]},
  { id:"s2",ref:"S2600000124",projectId:"p1",customerRef:"USGOLD 2",mode:"air",status:"delivered",origin:"Helsinki, FI",destination:"Houston, US",vessel:"—",voyage:"—",carrier:"Finnair Cargo",routing:"Helsinki → New York (JFK) → Houston",etd:"2026-03-01",eta:"2026-03-04",containerType:"Air cargo, 2 pallets",updatedAt:new Date().toISOString(),
    milestones:[{id:"m1",label:"Cargo Ready",date:"2026-02-27",done:true},{id:"m2",label:"Booked",date:"2026-02-28",done:true},{id:"m3",label:"ETD Helsinki",date:"2026-03-01",done:true},{id:"m4",label:"ETA Houston",date:"2026-03-04",done:true},{id:"m5",label:"Customs Clearance",date:"2026-03-05",done:true},{id:"m6",label:"Delivered",date:"2026-03-06",done:true}],
    costs:{quoted:4800,items:[{id:"c1",category:"transport",desc:"Air freight (Finnair)",amount:3600,currency:"EUR"},{id:"c2",category:"origin",desc:"Handling + documentation",amount:280,currency:"EUR"},{id:"c3",category:"destination",desc:"Handling Houston",amount:420,currency:"USD"}],running:[]},notes:[]},
  { id:"s3",ref:"S2600000125",projectId:"p1",customerRef:"USGOLD 3",mode:"ocean",status:"booked",origin:"Helsinki, FI",destination:"Houston, US",vessel:"Hapag-Lloyd Berlin Express",voyage:"045W",carrier:"Hapag-Lloyd",routing:"Helsinki → Hamburg → Houston",etd:"2026-04-05",eta:"2026-05-02",containerType:"1 x 40'HC",updatedAt:new Date().toISOString(),
    milestones:[{id:"m1",label:"Cargo Ready",date:"2026-03-30",done:false},{id:"m2",label:"S/I Cut-off",date:"2026-04-02",done:false},{id:"m3",label:"VGM Cut-off",date:"2026-04-03",done:false},{id:"m4",label:"ETD Helsinki",date:"2026-04-05",done:false},{id:"m5",label:"Transhipment Hamburg",date:"2026-04-10",done:false},{id:"m6",label:"ETA Houston",date:"2026-05-02",done:false}],
    costs:{quoted:7800,items:[{id:"c1",category:"origin",desc:"Pickup + stuffing",amount:900,currency:"EUR"},{id:"c2",category:"transport",desc:"Ocean freight (Hapag-Lloyd)",amount:5400,currency:"EUR"},{id:"c3",category:"origin",desc:"THC Helsinki",amount:380,currency:"EUR"}],running:[]},notes:[]},
  { id:"s4",ref:"S2600000126",projectId:"p2",customerRef:"NORDPULP 1",mode:"ocean",status:"in_transit",origin:"Kotka, FI",destination:"Shanghai, CN",vessel:"COSCO Shipping Universe",voyage:"012E",carrier:"COSCO Shipping",routing:"Kotka → Bremerhaven → Port Klang → Shanghai",etd:"2026-03-20",eta:"2026-04-28",containerType:"4 x 40'HC",updatedAt:new Date().toISOString(),
    milestones:[{id:"m1",label:"Cargo Ready",date:"2026-03-14",done:true},{id:"m2",label:"S/I Cut-off",date:"2026-03-17",done:true},{id:"m3",label:"VGM Cut-off",date:"2026-03-18",done:true},{id:"m4",label:"ETD Kotka",date:"2026-03-20",done:true},{id:"m5",label:"Transhipment Bremerhaven",date:"2026-03-26",done:false},{id:"m6",label:"Transhipment Port Klang",date:"2026-04-14",done:false},{id:"m7",label:"ETA Shanghai",date:"2026-04-28",done:false}],
    costs:{quoted:28400,items:[{id:"c1",category:"origin",desc:"Pickup Kotka",amount:1200,currency:"EUR"},{id:"c2",category:"transport",desc:"Ocean freight COSCO (4x40HC)",amount:21600,currency:"EUR"},{id:"c3",category:"origin",desc:"THC Kotka",amount:1600,currency:"EUR"},{id:"c4",category:"destination",desc:"THC Shanghai",amount:2200,currency:"USD"}],running:[]},notes:[]},
  { id:"s5",ref:"S2600000127",projectId:null,customerRef:null,mode:"ocean",status:"planned",origin:"Helsinki, FI",destination:"Dalian, CN",vessel:"TBD",voyage:"TBD",carrier:"Hapag-Lloyd",routing:"Helsinki → Dalian (direct service)",etd:"2026-04-15",eta:"2026-05-27",containerType:"1 x 40'HC",updatedAt:new Date().toISOString(),
    milestones:[{id:"m1",label:"Cargo Ready",date:"2026-04-10",done:false},{id:"m2",label:"Booking Confirmed",date:null,done:false},{id:"m3",label:"S/I Cut-off",date:null,done:false},{id:"m4",label:"ETD Helsinki",date:"2026-04-15",done:false},{id:"m5",label:"ETA Dalian",date:"2026-05-27",done:false}],
    costs:{quoted:7200,items:[{id:"c1",category:"transport",desc:"Ocean freight (Hapag-Lloyd quote)",amount:5800,currency:"EUR"},{id:"c2",category:"origin",desc:"Pickup + stuffing + THC",amount:1100,currency:"EUR"}],running:[]},notes:[]},
  { id:"s6",ref:"S2600000128",projectId:"p2",customerRef:"NORDPULP 2",mode:"truck",status:"in_transit",origin:"Kotka, FI",destination:"Stockholm, SE",vessel:"—",voyage:"—",carrier:"DSV Road",routing:"Kotka → Turku (ferry) → Stockholm",etd:"2026-03-29",eta:"2026-03-31",containerType:"Full truck load",updatedAt:new Date().toISOString(),
    milestones:[{id:"m1",label:"Cargo Ready",date:"2026-03-28",done:true},{id:"m2",label:"Pickup",date:"2026-03-29",done:true},{id:"m3",label:"Ferry Turku-Stockholm",date:"2026-03-30",done:false},{id:"m4",label:"Delivered Stockholm",date:"2026-03-31",done:false}],
    costs:{quoted:2800,items:[{id:"c1",category:"transport",desc:"FTL Kotka-Stockholm via DSV",amount:2200,currency:"EUR"},{id:"c2",category:"transport",desc:"Ferry crossing",amount:380,currency:"EUR"}],running:[{id:"r1",desc:"Waiting time at origin",dailyRate:450,currency:"EUR",startDate:"2026-03-28",status:"stopped",endDate:"2026-03-29",totalDays:1}]},notes:[]},
];

// ─── Init ─────────────────────────────────────────────────────────────────────

export async function initDB() {
  if (isCloud()) return; // Cloud needs no local init
  const db = getDB();
  const count = await db.shipments.count();
  if (count === 0 && getMode() === 'test') {
    await db.projects.bulkAdd(SEED_PROJECTS);
    await db.shipments.bulkAdd(SEED_SHIPMENTS);
  }
}

// ─── PROJECTS ─────────────────────────────────────────────────────────────────

export async function getProjects() {
  if (isCloud()) return cloud.getProjects();
  return getDB().projects.toArray();
}
export async function addProject(project) {
  if (isCloud()) return cloud.addProject(project);
  return getDB().projects.add(project);
}
export async function updateProject(id, changes) {
  if (isCloud()) return cloud.updateProject(id, changes);
  return getDB().projects.update(id, changes);
}
export async function deleteProject(id) {
  if (isCloud()) return cloud.deleteProject(id);
  return getDB().projects.delete(id);
}

// ─── SHIPMENTS ────────────────────────────────────────────────────────────────

export async function getShipments() {
  if (isCloud()) return cloud.getShipments();
  return getDB().shipments.toArray();
}
export async function getShipment(id) {
  if (isCloud()) return cloud.getShipment(id);
  return getDB().shipments.get(id);
}
export async function addShipment(shipment) {
  if (isCloud()) return cloud.addShipment(shipment);
  shipment.updatedAt = new Date().toISOString();
  return getDB().shipments.add(shipment);
}
export async function updateShipment(id, changes) {
  if (isCloud()) return cloud.updateShipment(id, changes);
  changes.updatedAt = new Date().toISOString();
  return getDB().shipments.update(id, changes);
}
export async function deleteShipment(id) {
  if (isCloud()) return cloud.deleteShipment(id);
  const db = getDB();
  await db.documents.where('shipmentId').equals(id).delete();
  await db.activities.where('shipmentId').equals(id).delete();
  return db.shipments.delete(id);
}
export async function getNextRef() {
  if (isCloud()) return cloud.getNextRef();
  const all = await getDB().shipments.toArray();
  const year = new Date().getFullYear().toString().slice(2);
  let maxNum = 0;
  all.forEach(s => { const match = (s.ref || "").match(/^S(\d{2})(\d+)$/); if (match && match[1] === year) { const num = parseInt(match[2], 10); if (num > maxNum) maxNum = num; } });
  return `S${year}${(maxNum + 1).toString().padStart(8, '0')}`;
}
export async function toggleMilestone(shipmentId, milestoneId) {
  if (isCloud()) return cloud.toggleMilestone(shipmentId, milestoneId);
  const db = getDB();
  const shipment = await db.shipments.get(shipmentId);
  if (!shipment) return;
  const milestones = shipment.milestones.map(m => m.id === milestoneId ? { ...m, done: !m.done } : m);
  return db.shipments.update(shipmentId, { milestones, updatedAt: new Date().toISOString() });
}

// ─── DOCUMENTS ────────────────────────────────────────────────────────────────

export async function getDocuments(shipmentId) {
  if (isCloud()) return cloud.getDocuments(shipmentId);
  return getDB().documents.where('shipmentId').equals(shipmentId).toArray();
}
export async function getAllDocuments() {
  if (isCloud()) return cloud.getAllDocuments();
  return getDB().documents.toArray();
}
export async function addDocument(doc) {
  if (isCloud()) return cloud.addDocument(doc);
  return getDB().documents.add(doc);
}
export async function deleteDocument(id) {
  if (isCloud()) return cloud.deleteDocument(id);
  return getDB().documents.delete(id);
}

// ─── ACTIVITIES ───────────────────────────────────────────────────────────────

export async function addActivity(activity) {
  if (isCloud()) return cloud.addActivity(activity);
  return getDB().activities.add(activity);
}
export async function getActivities(limit = 50) {
  if (isCloud()) return cloud.getActivities(limit);
  return getDB().activities.orderBy('timestamp').reverse().limit(limit).toArray();
}
export async function getShipmentActivities(shipmentId) {
  if (isCloud()) return cloud.getShipmentActivities(shipmentId);
  return getDB().activities.where('shipmentId').equals(shipmentId).toArray();
}

// ─── TEMPLATES ────────────────────────────────────────────────────────────────

export async function getTemplates() {
  if (isCloud()) return cloud.getTemplates();
  return getDB().templates.toArray();
}
export async function addTemplate(template) {
  if (isCloud()) return cloud.addTemplate(template);
  return getDB().templates.add(template);
}
export async function deleteTemplate(id) {
  if (isCloud()) return cloud.deleteTemplate(id);
  return getDB().templates.delete(id);
}

// ─── BACKUP (local only — export/import always uses IndexedDB) ────────────────

export async function exportData(password) {
  const db = getDB();
  const data = {
    version: 4, mode: getMode(), exportedAt: new Date().toISOString(),
    projects:   await db.projects.toArray(),
    shipments:  await db.shipments.toArray(),
    documents:  (await db.documents.toArray()).map(d => ({ ...d, base64Data: undefined })),
    activities: await db.activities.toArray(),
    templates:  await db.templates.toArray(),
    quotes:     db.quotes ? await db.quotes.toArray() : [],
  };
  const json = JSON.stringify(data);
  if (!password) return json;
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(json));
  const packed = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  packed.set(salt, 0); packed.set(iv, salt.length); packed.set(new Uint8Array(encrypted), salt.length + iv.length);
  return btoa(String.fromCharCode(...packed));
}

export async function importData(input, password) {
  let data;
  try { data = JSON.parse(input); } catch {
    if (!password) throw new Error('Encrypted backup — password required.');
    const packed = Uint8Array.from(atob(input), c => c.charCodeAt(0));
    const salt = packed.slice(0, 16), iv = packed.slice(16, 28), ciphertext = packed.slice(28);
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    try { const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext); data = JSON.parse(new TextDecoder().decode(decrypted)); }
    catch { throw new Error('Wrong password or corrupted backup.'); }
  }
  if (!data.projects || !data.shipments) throw new Error('Invalid backup format.');
  const db = getDB();
  await db.projects.clear(); await db.shipments.clear(); await db.documents.clear(); await db.activities.clear(); await db.templates.clear();
  if (data.projects.length)    await db.projects.bulkAdd(data.projects);
  if (data.shipments.length)   await db.shipments.bulkAdd(data.shipments);
  if (data.documents?.length)  await db.documents.bulkAdd(data.documents);
  if (data.activities?.length) await db.activities.bulkAdd(data.activities);
  if (data.templates?.length)  await db.templates.bulkAdd(data.templates);
  return { projects: data.projects.length, shipments: data.shipments.length, documents: data.documents?.length || 0 };
}

export async function resetDB() {
  const db = getDB();
  await db.shipments.clear(); await db.projects.clear(); await db.documents.clear(); await db.activities.clear(); await db.templates.clear();
  if (getMode() === 'test') { await db.projects.bulkAdd(SEED_PROJECTS); await db.shipments.bulkAdd(SEED_SHIPMENTS); }
}

export default getDB;
