// quoteParsers.js — Parse freight quote costs from email body text
// Handles formats like: "Trucking Kuopio-Helsinki: EUR 550,-"
//                       "Local trucking USD 500,- per container"

// ─── Cost category mapping ──────────────────────────────────────────────────

const CATEGORY_PATTERNS = [
  // Origin charges
  { rx: /^(?:local\s*)?trucking.*(?:to|[-–])\s*\w+/i, category: 'origin', subcategory: 'trucking' },
  { rx: /^origin\s*THC/i, category: 'origin', subcategory: 'thc' },
  { rx: /^origin\s*handling/i, category: 'origin', subcategory: 'handling' },
  { rx: /^export\s*customs/i, category: 'origin', subcategory: 'customs' },
  { rx: /^loading/i, category: 'origin', subcategory: 'loading' },
  { rx: /^warehousing.*origin/i, category: 'origin', subcategory: 'warehousing' },

  // Transport / ocean freight
  { rx: /^ocean\s*freight/i, category: 'transport', subcategory: 'ocean_freight' },
  { rx: /^sea\s*freight/i, category: 'transport', subcategory: 'ocean_freight' },
  { rx: /^freight\b/i, category: 'transport', subcategory: 'ocean_freight' },
  { rx: /^BL\s*fee/i, category: 'transport', subcategory: 'bl_fee' },
  { rx: /^B\/L\s*fee/i, category: 'transport', subcategory: 'bl_fee' },
  { rx: /^documentation\s*fee/i, category: 'transport', subcategory: 'doc_fee' },
  { rx: /^BAF\b/i, category: 'transport', subcategory: 'baf' },
  { rx: /^CAF\b/i, category: 'transport', subcategory: 'caf' },
  { rx: /^LSS\b/i, category: 'transport', subcategory: 'lss' },
  { rx: /^EBS\b/i, category: 'transport', subcategory: 'ebs' },
  { rx: /^PSS\b/i, category: 'transport', subcategory: 'pss' },
  { rx: /^GRI\b/i, category: 'transport', subcategory: 'gri' },
  { rx: /^ISPS/i, category: 'transport', subcategory: 'isps' },
  { rx: /^war\s*risk/i, category: 'transport', subcategory: 'war_risk' },
  { rx: /^piracy/i, category: 'transport', subcategory: 'piracy' },
  { rx: /^suez|^canal/i, category: 'transport', subcategory: 'canal' },

  // Destination charges
  { rx: /^destination\s*THC/i, category: 'destination', subcategory: 'thc' },
  { rx: /^dest(?:ination)?\s*handling/i, category: 'destination', subcategory: 'handling' },
  { rx: /^import\s*customs/i, category: 'destination', subcategory: 'customs' },
  { rx: /^delivery|^last\s*mile/i, category: 'destination', subcategory: 'delivery' },
  { rx: /^unloading/i, category: 'destination', subcategory: 'unloading' },
  { rx: /^demurrage/i, category: 'destination', subcategory: 'demurrage' },
  { rx: /^detention/i, category: 'destination', subcategory: 'detention' },

  // Trucking with destination hint
  { rx: /^(?:local\s*)?trucking/i, category: 'transport', subcategory: 'trucking' },
];

function detectCategory(description) {
  for (const { rx, category, subcategory } of CATEGORY_PATTERNS) {
    if (rx.test(description)) return { category, subcategory };
  }
  return { category: 'other', subcategory: 'misc' };
}

// ─── Parse a single cost line ───────────────────────────────────────────────

function parseCostLine(line) {
  if (!line || line.trim().length < 5) return null;

  // Pattern: "Description: CURRENCY amount,- [per unit]"
  // Variations:
  //   "Trucking Kuopio-Helsinki: EUR 550,-"
  //   "Local trucking USD 500,- per container"
  //   "Ocean freight Helsinki-Houston: EUR 6190,-"
  //   "BL fee: EUR 75,- per BL"
  //   "Origin THC: EUR 950,-"

  const costRx = /^(.+?)[:\s]+\b(EUR|USD|GBP|SEK|NOK|DKK|CNY|JPY)\s*([\d,\.]+)\s*,?-?\s*(.*)?$/i;
  const m = line.trim().match(costRx);
  if (!m) return null;

  const description = m[1].trim();
  const currency = m[2].toUpperCase();
  const amount = parseFloat(m[3].replace(',', '.'));
  const suffix = (m[4] || '').trim().toLowerCase();

  if (isNaN(amount) || amount <= 0) return null;

  // Parse "per container", "per BL", etc.
  let perUnit = 'total';
  if (/per\s*container/i.test(suffix) || /per\s*cntr/i.test(suffix)) perUnit = 'per_container';
  else if (/per\s*BL/i.test(suffix) || /per\s*b\/l/i.test(suffix)) perUnit = 'per_bl';
  else if (/per\s*TEU/i.test(suffix)) perUnit = 'per_teu';
  else if (/per\s*shipment/i.test(suffix)) perUnit = 'per_shipment';

  const { category, subcategory } = detectCategory(description);

  // Try to extract route from description
  const routeMatch = description.match(/(.+?)\s+([\w\s]+?)[-–]([\w\s]+?)$/);
  let route = null;
  if (routeMatch) {
    route = { from: routeMatch[2].trim(), to: routeMatch[3].trim() };
  }

  return {
    id: 'qc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    description,
    currency,
    amount,
    perUnit,
    category,
    subcategory,
    route,
  };
}

// ─── Parse full quote text ──────────────────────────────────────────────────

export function parseQuoteText(text) {
  if (!text) return null;

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const costs = [];

  for (const line of lines) {
    const parsed = parseCostLine(line);
    if (parsed) costs.push(parsed);
  }

  if (costs.length === 0) return null;

  return { costs };
}

// ─── Parse quote from email subject ─────────────────────────────────────────

export function parseQuoteSubject(subject) {
  if (!subject) return null;

  // "QUOTE KUOPIO-HOUSTON / 1x40'HC"
  // "QUOTE DALIAN-HELSINKI / 4x40'HC"
  const m = subject.match(/QUOTE\s+([\w\s]+?)[-–]\s*([\w\s]+?)\s*\/?\s*(\d+)\s*x?\s*([\d']+\s*\w+)/i);
  if (!m) {
    // Try simpler: "QUOTE ORIGIN-DEST ..."
    const m2 = subject.match(/QUOTE\s+([\w\s]+?)[-–]\s*([\w\s]+?)(?:\s*\/|\s*$)/i);
    if (m2) return { origin: m2[1].trim(), destination: m2[2].trim(), containerCount: null, containerType: null };
    return null;
  }

  return {
    origin: m[1].trim(),
    destination: m[2].trim(),
    containerCount: +m[3],
    containerType: m[4].replace(/'/g, '').trim(),
  };
}

// ─── Build quote object from parsed data ────────────────────────────────────

export function buildQuoteFromEmail(subject, bodyText) {
  const subjectData = parseQuoteSubject(subject);
  const bodyData = parseQuoteText(bodyText);

  if (!subjectData && !bodyData) return null;

  const quote = {
    id: 'q_' + Date.now(),
    source: 'email',
    origin: subjectData?.origin || null,
    destination: subjectData?.destination || null,
    containerCount: subjectData?.containerCount || null,
    containerType: subjectData?.containerType || null,
    costs: bodyData?.costs || [],
    totalEUR: 0,
    totalUSD: 0,
    createdAt: new Date().toISOString(),
    validUntil: null,
    carrier: null,
    quoteNumber: null,
    shipmentId: null,
  };

  // Sum up costs by currency
  for (const c of quote.costs) {
    if (c.currency === 'EUR') quote.totalEUR += c.amount;
    else if (c.currency === 'USD') quote.totalUSD += c.amount;
  }

  return quote;
}
