// tracking.js — Client-side carrier tracking logic

const WORKER_URL_KEY = 'cargodesk_tracking_worker_url';
const POLL_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours

// ─── Worker URL management ──────────────────────────────────────────────────

export function getWorkerUrl() {
  try { return localStorage.getItem(WORKER_URL_KEY) || ''; } catch { return ''; }
}

export function setWorkerUrl(url) {
  try { localStorage.setItem(WORKER_URL_KEY, url.replace(/\/$/, '')); } catch {}
}

export function isTrackingConfigured() {
  return getWorkerUrl().length > 0;
}

// ─── Direct tracking URLs ───────────────────────────────────────────────────

const TRACKING_URLS = {
  'Hapag-Lloyd': (ref) => `https://www.hapag-lloyd.com/en/online-business/track/track-by-booking-solution.html?blno=${ref}`,
  'MSC': (ref) => `https://www.msc.com/en/track-a-shipment?agencyPath=msc&searchText=${ref}`,
  'COSCO Shipping': (ref) => `https://elines.coscoshipping.com/ebusiness/cargoTracking?trackingType=BOOKING&number=${ref}`,
  'COSCO': (ref) => `https://elines.coscoshipping.com/ebusiness/cargoTracking?trackingType=BOOKING&number=${ref}`,
  'CMA CGM': (ref) => `https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=BookingNumber&Reference=${ref}`,
  'ONE': (ref) => `https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking?search-type=BK&search-name=${ref}`,
  'OOCL': (ref) => `https://www.oocl.com/eng/ourservices/eservices/cargotracking/Pages/cargotracking.aspx?ref=${ref}`,
  'Maersk': (ref) => `https://www.maersk.com/tracking/${ref}`,
  'Evergreen': (ref) => `https://www.shipmentlink.com/servlet/TDB1_CargoTracking.do?BkgNo=${ref}`,
  'ZIM': (ref) => `https://www.zim.com/tools/track-a-shipment?consnumber=${ref}`,
};

export function getTrackingUrl(carrier, bookingNumber) {
  if (!carrier || !bookingNumber) return null;
  const fn = TRACKING_URLS[carrier] || Object.entries(TRACKING_URLS).find(([k]) =>
    carrier.toLowerCase().includes(k.toLowerCase().split(' ')[0])
  )?.[1];
  return fn ? fn(bookingNumber) : null;
}

export function getCarrierTrackingSupport(carrier) {
  if (!carrier) return { hasDirectLink: false, hasApiTracking: false };
  const normalized = carrier.toLowerCase().replace(/[^a-z0-9]/g, '');
  const hasDirectLink = !!getTrackingUrl(carrier, 'test');
  const apiCarriers = ['hapagloyd', 'hapaglloyd', 'msc', 'maersk'];
  const hasApiTracking = apiCarriers.some(c => normalized.includes(c));
  return { hasDirectLink, hasApiTracking };
}

// ─── API tracking via Cloudflare Worker ─────────────────────────────────────

export async function fetchTracking(carrier, bookingNumber) {
  const workerUrl = getWorkerUrl();
  if (!workerUrl) {
    return { success: false, error: 'Tracking worker URL not configured. Set it in Settings.', trackingUrl: getTrackingUrl(carrier, bookingNumber) };
  }
  try {
    const resp = await fetch(`${workerUrl}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carrier, bookingNumber }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
      return { success: false, error: err.error || `Worker returned ${resp.status}`, trackingUrl: getTrackingUrl(carrier, bookingNumber) };
    }
    const data = await resp.json();
    data.trackingUrl = data.trackingUrl || getTrackingUrl(carrier, bookingNumber);
    return data;
  } catch (err) {
    return { success: false, error: `Network error: ${err.message}`, trackingUrl: getTrackingUrl(carrier, bookingNumber) };
  }
}

// ─── Polling management ─────────────────────────────────────────────────────

const LAST_POLL_KEY = 'cargodesk_last_poll';

export function getLastPollTime(shipmentId) {
  try { return JSON.parse(localStorage.getItem(LAST_POLL_KEY) || '{}')[shipmentId] || null; } catch { return null; }
}

export function setLastPollTime(shipmentId) {
  try {
    const data = JSON.parse(localStorage.getItem(LAST_POLL_KEY) || '{}');
    data[shipmentId] = new Date().toISOString();
    localStorage.setItem(LAST_POLL_KEY, JSON.stringify(data));
  } catch {}
}

export function shouldPoll(shipmentId) {
  const last = getLastPollTime(shipmentId);
  if (!last) return true;
  return (Date.now() - new Date(last).getTime()) > POLL_INTERVAL;
}
