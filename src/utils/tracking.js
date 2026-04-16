// tracking.js — Client-side carrier tracking utility
// Direct tracking links, worker calls for vessel AIS, local event log

const WORKER_URL_KEY = 'cargodesk_tracking_worker_url';
const CACHE_KEY_PREFIX = 'cargodesk_track_';

// ─── Worker URL ───────────────────────────────────────────────────────────────

export function getWorkerUrl() {
  try { return localStorage.getItem(WORKER_URL_KEY) || ''; } catch { return ''; }
}
export function setWorkerUrl(url) {
  try { localStorage.setItem(WORKER_URL_KEY, (url || '').trim().replace(/\/$/, '')); } catch {}
}
export function isTrackingConfigured() {
  return getWorkerUrl().length > 0;
}

// ─── Direct carrier tracking URLs ────────────────────────────────────────────

const CARRIER_URLS = {
  'Hapag-Lloyd':    (ref) => `https://www.hapag-lloyd.com/en/online-business/tracing/tracing-by-booking.html?blno=${ref}`,
  'MSC':            (ref) => `https://www.msc.com/en/track-a-shipment?agencyPath=msc&searchText=${ref}`,
  'COSCO':          (ref) => `https://elines.coscoshipping.com/ebusiness/cargoTracking?trackingType=BOOKING&number=${ref}`,
  'COSCO Shipping': (ref) => `https://elines.coscoshipping.com/ebusiness/cargoTracking?trackingType=BOOKING&number=${ref}`,
  'CMA CGM':        (ref) => `https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=BookingNumber&Reference=${ref}`,
  'CMA-CGM':        (ref) => `https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=BookingNumber&Reference=${ref}`,
  'ONE':            (ref) => `https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking?search-type=BK&search-name=${ref}`,
  'OOCL':           (ref) => `https://www.oocl.com/eng/ourservices/eservices/cargotracking/Pages/cargotracking.aspx?ref=${ref}`,
  'Maersk':         (ref) => `https://www.maersk.com/tracking/${ref}`,
  'Evergreen':      (ref) => `https://www.shipmentlink.com/servlet/TDB1_CargoTracking.do?BkgNo=${ref}`,
  'ZIM':            (ref) => `https://www.zim.com/tools/track-a-shipment?consnumber=${ref}`,
  'Yang Ming':      (ref) => `https://www.yangming.com/e-service/Track_Trace/track_trace_cargo_tracking.aspx?number=${ref}`,
  'HMM':            (ref) => `https://www.hmm21.com/cms/business/ebiz/trackTrace/trackTraceView/index.jsp?blNo=${ref}`,
  'DSV':            (ref) => `https://www.dsv.com/en/track-and-trace?trackingNumber=${ref}`,
  'DB Schenker':    (ref) => `https://www.dbschenker.com/global/tracking/?id=${ref}`,
  'Kuehne+Nagel':   (ref) => `https://kn-portal.com/tracking/?q=${ref}`,
};

export function getDirectTrackingUrl(carrier, ref) {
  if (!carrier || !ref) return null;

  // Exact match first
  if (CARRIER_URLS[carrier]) return CARRIER_URLS[carrier](ref);

  // Fuzzy match — normalize both sides
  const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cn = normalize(carrier);
  const match = Object.entries(CARRIER_URLS).find(([k]) => {
    const kn = normalize(k);
    return cn.includes(kn) || kn.includes(cn);
  });
  return match ? match[1](ref) : null;
}

// ─── Best tracking reference ──────────────────────────────────────────────────

export function getBestRef(shipment) {
  return shipment.blNumber || shipment.quotationNumber || shipment.ref || null;
}

// ─── Local event log ──────────────────────────────────────────────────────────

function cacheKey(shipmentId) { return `${CACHE_KEY_PREFIX}${shipmentId}`; }

export function getTrackingLog(shipmentId) {
  try {
    return JSON.parse(localStorage.getItem(cacheKey(shipmentId)) || '[]');
  } catch { return []; }
}

export function addTrackingEvent(shipmentId, event) {
  try {
    const log = getTrackingLog(shipmentId);
    const entry = {
      id: `te_${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...event,
    };
    // Keep last 50 events
    const updated = [entry, ...log].slice(0, 50);
    localStorage.setItem(cacheKey(shipmentId), JSON.stringify(updated));
    return entry;
  } catch { return null; }
}

export function clearTrackingLog(shipmentId) {
  try { localStorage.removeItem(cacheKey(shipmentId)); } catch {}
}

// ─── Vessel position lookup via worker ───────────────────────────────────────

export async function fetchVesselPosition(vesselName, imoNumber) {
  const url = getWorkerUrl();
  if (!url || (!vesselName && !imoNumber)) return null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'vessel', vesselName, imoNumber }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.position : null;
  } catch { return null; }
}

// ─── Last checked tracking ────────────────────────────────────────────────────

const LAST_CHECK_KEY = 'cargodesk_last_track_';

export function getLastChecked(shipmentId) {
  try { return localStorage.getItem(`${LAST_CHECK_KEY}${shipmentId}`) || null; } catch { return null; }
}

export function setLastChecked(shipmentId) {
  try { localStorage.setItem(`${LAST_CHECK_KEY}${shipmentId}`, new Date().toISOString()); } catch {}
}
