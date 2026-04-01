import Dexie from 'dexie';

const db = new Dexie('CargoDesk');

db.version(2).stores({
  projects: 'id, name, customer, status',
  shipments: 'id, ref, projectId, customerRef, mode, status, origin, destination, carrier, etd, eta',
  documents: 'id, shipmentId, name, type, date, quoteNumber, bookingNumber',
});

// ---------- SEED DATA ----------

const SEED_PROJECTS = [
  { id: "p1", name: "USGOLD", customer: "US Gold Mining Corp", status: "active" },
  { id: "p2", name: "NORDPULP", customer: "Nordic Pulp & Paper", status: "active" },
];

const SEED_SHIPMENTS = [
  { id:"s1",ref:"S2600000123",projectId:"p1",customerRef:"USGOLD 1",mode:"ocean",status:"in_transit",origin:"Helsinki",destination:"Houston",vessel:"MSC Irina",voyage:"AE325W",carrier:"MSC",routing:"Helsinki → Rotterdam → Houston",etd:"2026-03-15",eta:"2026-04-18",containerType:"2 x 40'HC",
    milestones:[{id:"m1",label:"Cargo Ready",date:"2026-03-10",done:true},{id:"m2",label:"S/I Cut-off",date:"2026-03-12",done:true},{id:"m3",label:"VGM Cut-off",date:"2026-03-13",done:true},{id:"m4",label:"ETD Helsinki",date:"2026-03-15",done:true},{id:"m5",label:"Transhipment Rotterdam",date:"2026-03-22",done:true},{id:"m6",label:"ETA Houston",date:"2026-04-18",done:false},{id:"m7",label:"Customs Clearance",date:"2026-04-20",done:false},{id:"m8",label:"Delivered",date:"2026-04-22",done:false}],
    costs:{quoted:14200,items:[{id:"c1",category:"origin",desc:"Pickup + stuffing",amount:1800,currency:"EUR"},{id:"c2",category:"transport",desc:"Ocean freight (MSC)",amount:9200,currency:"EUR"},{id:"c3",category:"origin",desc:"THC Helsinki",amount:450,currency:"EUR"},{id:"c4",category:"destination",desc:"THC Houston",amount:680,currency:"USD"},{id:"c5",category:"destination",desc:"Customs brokerage",amount:350,currency:"USD"}],running:[]}},
  { id:"s2",ref:"S2600000124",projectId:"p1",customerRef:"USGOLD 2",mode:"air",status:"delivered",origin:"Helsinki",destination:"Houston",vessel:"—",voyage:"—",carrier:"Finnair Cargo",routing:"Helsinki → New York (JFK) → Houston",etd:"2026-03-01",eta:"2026-03-04",containerType:"Air cargo, 2 pallets",
    milestones:[{id:"m1",label:"Cargo Ready",date:"2026-02-27",done:true},{id:"m2",label:"Booked",date:"2026-02-28",done:true},{id:"m3",label:"ETD Helsinki",date:"2026-03-01",done:true},{id:"m4",label:"ETA Houston",date:"2026-03-04",done:true},{id:"m5",label:"Customs Clearance",date:"2026-03-05",done:true},{id:"m6",label:"Delivered",date:"2026-03-06",done:true}],
    costs:{quoted:4800,items:[{id:"c1",category:"transport",desc:"Air freight (Finnair)",amount:3600,currency:"EUR"},{id:"c2",category:"origin",desc:"Handling + documentation",amount:280,currency:"EUR"},{id:"c3",category:"destination",desc:"Handling Houston",amount:420,currency:"USD"}],running:[]}},
  { id:"s3",ref:"S2600000125",projectId:"p1",customerRef:"USGOLD 3",mode:"ocean",status:"booked",origin:"Helsinki",destination:"Houston",vessel:"Hapag-Lloyd Berlin Express",voyage:"045W",carrier:"Hapag-Lloyd",routing:"Helsinki → Hamburg → Houston",etd:"2026-04-05",eta:"2026-05-02",containerType:"1 x 40'HC",
    milestones:[{id:"m1",label:"Cargo Ready",date:"2026-03-30",done:false},{id:"m2",label:"S/I Cut-off",date:"2026-04-02",done:false},{id:"m3",label:"VGM Cut-off",date:"2026-04-03",done:false},{id:"m4",label:"ETD Helsinki",date:"2026-04-05",done:false},{id:"m5",label:"Transhipment Hamburg",date:"2026-04-10",done:false},{id:"m6",label:"ETA Houston",date:"2026-05-02",done:false}],
    costs:{quoted:7800,items:[{id:"c1",category:"origin",desc:"Pickup + stuffing",amount:900,currency:"EUR"},{id:"c2",category:"transport",desc:"Ocean freight (Hapag-Lloyd)",amount:5400,currency:"EUR"},{id:"c3",category:"origin",desc:"THC Helsinki",amount:380,currency:"EUR"}],running:[]}},
  { id:"s4",ref:"S2600000126",projectId:"p2",customerRef:"NORDPULP 1",mode:"ocean",status:"in_transit",origin:"Kotka",destination:"Shanghai",vessel:"COSCO Shipping Universe",voyage:"012E",carrier:"COSCO",routing:"Kotka → Bremerhaven → Port Klang → Shanghai",etd:"2026-03-20",eta:"2026-04-28",containerType:"4 x 40'HC",
    milestones:[{id:"m1",label:"Cargo Ready",date:"2026-03-14",done:true},{id:"m2",label:"S/I Cut-off",date:"2026-03-17",done:true},{id:"m3",label:"VGM Cut-off",date:"2026-03-18",done:true},{id:"m4",label:"ETD Kotka",date:"2026-03-20",done:true},{id:"m5",label:"Transhipment Bremerhaven",date:"2026-03-26",done:false},{id:"m6",label:"Transhipment Port Klang",date:"2026-04-14",done:false},{id:"m7",label:"ETA Shanghai",date:"2026-04-28",done:false}],
    costs:{quoted:28400,items:[{id:"c1",category:"origin",desc:"Pickup Kotka",amount:1200,currency:"EUR"},{id:"c2",category:"transport",desc:"Ocean freight COSCO (4x40HC)",amount:21600,currency:"EUR"},{id:"c3",category:"origin",desc:"THC Kotka",amount:1600,currency:"EUR"},{id:"c4",category:"destination",desc:"THC Shanghai",amount:2200,currency:"USD"}],running:[]}},
  { id:"s5",ref:"S2600000127",projectId:null,customerRef:null,mode:"ocean",status:"planned",origin:"Helsinki",destination:"Dalian",vessel:"TBD",voyage:"TBD",carrier:"Hapag-Lloyd",routing:"Helsinki → Dalian (direct service)",etd:"2026-04-15",eta:"2026-05-27",containerType:"1 x 40'HC",
    milestones:[{id:"m1",label:"Cargo Ready",date:"2026-04-10",done:false},{id:"m2",label:"Booking Confirmed",date:null,done:false},{id:"m3",label:"S/I Cut-off",date:null,done:false},{id:"m4",label:"ETD Helsinki",date:"2026-04-15",done:false},{id:"m5",label:"ETA Dalian",date:"2026-05-27",done:false}],
    costs:{quoted:7200,items:[{id:"c1",category:"transport",desc:"Ocean freight (Hapag-Lloyd quote)",amount:5800,currency:"EUR"},{id:"c2",category:"origin",desc:"Pickup + stuffing + THC",amount:1100,currency:"EUR"}],running:[]}},
  { id:"s6",ref:"S2600000128",projectId:"p2",customerRef:"NORDPULP 2",mode:"truck",status:"in_transit",origin:"Kotka",destination:"Stockholm",vessel:"—",voyage:"—",carrier:"DSV Road",routing:"Kotka → Turku (ferry) → Stockholm",etd:"2026-03-29",eta:"2026-03-31",containerType:"Full truck load",
    milestones:[{id:"m1",label:"Cargo Ready",date:"2026-03-28",done:true},{id:"m2",label:"Pickup",date:"2026-03-29",done:true},{id:"m3",label:"Ferry Turku-Stockholm",date:"2026-03-30",done:false},{id:"m4",label:"Delivered Stockholm",date:"2026-03-31",done:false}],
    costs:{quoted:2800,items:[{id:"c1",category:"transport",desc:"FTL Kotka-Stockholm via DSV",amount:2200,currency:"EUR"},{id:"c2",category:"transport",desc:"Ferry crossing",amount:380,currency:"EUR"}],
      running:[{id:"r1",desc:"Waiting time at origin",dailyRate:450,currency:"EUR",startDate:"2026-03-28",status:"stopped",endDate:"2026-03-29",totalDays:1}]}},
];

// ---------- DATABASE OPERATIONS ----------

export async function initDB() {
  const count = await db.shipments.count();
  if (count === 0) {
    await db.projects.bulkAdd(SEED_PROJECTS);
    await db.shipments.bulkAdd(SEED_SHIPMENTS);
  }
}

// -- Projects --
export async function getProjects() { return db.projects.toArray(); }
export async function addProject(project) { return db.projects.add(project); }
export async function updateProject(id, changes) { return db.projects.update(id, changes); }
export async function deleteProject(id) { return db.projects.delete(id); }

// -- Shipments --
export async function getShipments() { return db.shipments.toArray(); }
export async function getShipment(id) { return db.shipments.get(id); }
export async function addShipment(shipment) { return db.shipments.add(shipment); }
export async function updateShipment(id, changes) { return db.shipments.update(id, changes); }
export async function deleteShipment(id) {
  await db.documents.where('shipmentId').equals(id).delete();
  return db.shipments.delete(id);
}

export async function getNextRef() {
  const all = await db.shipments.toArray();
  const year = new Date().getFullYear().toString().slice(2);
  let maxNum = 0;
  all.forEach(s => {
    const match = s.ref.match(/^S(\d{2})(\d+)$/);
    if (match && match[1] === year) {
      const num = parseInt(match[2], 10);
      if (num > maxNum) maxNum = num;
    }
  });
  return `S${year}${(maxNum + 1).toString().padStart(8, '0')}`;
}

export async function toggleMilestone(shipmentId, milestoneId) {
  const shipment = await db.shipments.get(shipmentId);
  if (!shipment) return;
  const milestones = shipment.milestones.map(m =>
    m.id === milestoneId ? { ...m, done: !m.done } : m
  );
  return db.shipments.update(shipmentId, { milestones });
}

export async function addCostItem(shipmentId, costItem) {
  const shipment = await db.shipments.get(shipmentId);
  if (!shipment) return;
  const items = [...shipment.costs.items, costItem];
  return db.shipments.update(shipmentId, { costs: { ...shipment.costs, items } });
}

export async function updateQuotedAmount(shipmentId, amount) {
  const shipment = await db.shipments.get(shipmentId);
  if (!shipment) return;
  return db.shipments.update(shipmentId, { costs: { ...shipment.costs, quoted: amount } });
}

// -- Documents --
export async function getDocuments(shipmentId) {
  return db.documents.where('shipmentId').equals(shipmentId).toArray();
}

export async function getAllDocuments() {
  return db.documents.toArray();
}

export async function addDocument(doc) {
  return db.documents.add(doc);
}

export async function deleteDocument(id) {
  return db.documents.delete(id);
}

export async function getDocumentsByQuoteNumber(quoteNumber) {
  return db.documents.where('quoteNumber').equals(quoteNumber).toArray();
}

// -- Reset (development) --
export async function resetDB() {
  await db.shipments.clear();
  await db.projects.clear();
  await db.documents.clear();
  await db.projects.bulkAdd(SEED_PROJECTS);
  await db.shipments.bulkAdd(SEED_SHIPMENTS);
}

export default db;
