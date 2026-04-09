// bookingParsers.js — Carrier-specific booking confirmation parsers
// Extracts: references, routing legs, deadlines/cut-offs, container info, vessel/voyage

// ─── Date helpers ───────────────────────────────────────────────────────────

function parseHLDate(str) {
  if (!str) return null;
  const m = str.trim().match(/(\d{2})-(\w{3})-(\d{4})\s*(\d{2}:\d{2})?/);
  if (!m) return null;
  const months = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
  const mon = months[m[2]];
  if (mon === undefined) return null;
  const [hh, mm] = m[4] ? m[4].split(':').map(Number) : [0, 0];
  return new Date(+m[3], mon, +m[1], hh, mm).toISOString();
}

function parseMSCDate(str) {
  if (!str) return null;
  const m = str.trim().match(/(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2}:\d{2})?/);
  if (!m) return null;
  const [hh, mm] = m[4] ? m[4].split(':').map(Number) : [0, 0];
  return new Date(+m[3], +m[2] - 1, +m[1], hh, mm).toISOString();
}

function isoDate(d) {
  return d ? new Date(d).toISOString().slice(0, 10) : null;
}

// ─── Port code → city name mapping ─────────────────────────────────────────

const PORT_NAMES = {
  'FIHEL': 'Helsinki, FI', 'DEBRV': 'Bremerhaven, DE', 'DEHAM': 'Hamburg, DE',
  'USHOU': 'Houston, US', 'USNYC': 'New York, US', 'USLAX': 'Los Angeles, US',
  'NLRTM': 'Rotterdam, NL', 'GBSOU': 'Southampton, GB', 'CNSHA': 'Shanghai, CN',
  'SGSIN': 'Singapore, SG', 'HKHKG': 'Hong Kong, HK', 'JPYOK': 'Yokohama, JP',
  'KRPUS': 'Busan, KR', 'FIRAU': 'Rauma, FI', 'FIKTK': 'Kotka, FI',
  'BEANR': 'Antwerp, BE', 'PKQCT': 'Karachi, PK', 'INMUN': 'Mundra, IN',
  'CNDAL': 'Dalian, CN', 'FIKOK': 'Kokkola, FI', 'FIOUL': 'Oulu, FI',
  'SEGOT': 'Gothenburg, SE', 'SESTH': 'Stockholm, SE',
};

function portName(code) {
  return PORT_NAMES[code] || code;
}

// ─── Hapag-Lloyd Parser ─────────────────────────────────────────────────────

export function parseHapagLloydBooking(text) {
  if (!text) return null;

  const isHL = /hapag.?lloyd/i.test(text) || /HLCU/i.test(text) || /Booking\s*Confirmation[\s\S]{0,30}ORIGINAL/i.test(text);
  if (!isHL) return null;

  const result = {
    carrier: 'Hapag-Lloyd',
    docType: 'booking_confirmation',
    references: {},
    routing: [],
    deadlines: [],
    container: {},
    commodity: null,
  };

  // ── References (work on full text, no line splitting needed) ──
  const ref = (rx) => { const m = text.match(rx); return m ? m[1].trim() : null; };
  result.references.ourReference = ref(/Our\s*Reference:\s*(\d+)/i);
  result.references.yourReference = ref(/Your\s*Reference:\s*(\S+(?:\s+\d+)?)/i);
  result.references.blNumber = ref(/BL\/SWB\s*No\(?s?\)?\.?:\s*(\S+)/i);
  result.references.quotationNumber = ref(/Quotation\s*No\.?:\s*(\S+)/i);
  result.references.bookingDate = ref(/Booking\s*Date:\s*([\d\-\w]+)/i);

  // ── Routing — extract section between "From To By ETD ETA" and "Import terminal" ──
  const routingMatch = text.match(/From\s+To\s+By\s+ETD\s+ETA\s+([\s\S]*?)Import\s*terminal/i);
  if (routingMatch) {
    const routingText = routingMatch[1];

    // Find all port codes in routing section
    const allCodes = [...routingText.matchAll(/\(([A-Z]{5})\)/g)].map(m => m[1]);
    // Deduplicate consecutive identical codes
    const codes = allCodes.filter((c, i) => i === 0 || c !== allCodes[i - 1]);

    // Find all date+time pairs in routing section
    const dates = [...routingText.matchAll(/(\d{2}-\w{3}-\d{4})\s+(\d{2}:\d{2})/g)];

    // Find vessel names — look for "Vessel XXXX" patterns
    const vessels = [...routingText.matchAll(/Vessel\s+([A-Z][A-Z\s]+?)(?:\s+DP\s+Voyage|\s+$)/gi)].map(m => m[1].trim());

    // Find voyage numbers
    const voyages = [...routingText.matchAll(/Voy\.\s*No:\s*(\S+)/gi)].map(m => m[1].trim());

    // Build legs from consecutive port code pairs
    for (let i = 0; i < codes.length - 1; i++) {
      const dateIdx = i * 2;
      result.routing.push({
        from: portName(codes[i]),
        to: portName(codes[i + 1]),
        vessel: vessels[i] || null,
        voyage: voyages[i] || null,
        etd: dates[dateIdx] ? parseHLDate(dates[dateIdx][1] + ' ' + dates[dateIdx][2]) : null,
        eta: dates[dateIdx + 1] ? parseHLDate(dates[dateIdx + 1][1] + ' ' + dates[dateIdx + 1][2]) : null,
      });
    }
  }

  // ── Deadlines — use targeted regex on full text ──
  const dlPatterns = [
    { rx: /Shipping\s*instruction\s*closing[\s\S]{0,80}?(\d{2}-\w{3}-\d{4})\s+(\d{2}:\d{2})/i, type: 'si_closing', label: 'SI Closing' },
    { rx: /VGM\s*cut[\-\s]*off[\s\S]{0,80}?(\d{2}-\w{3}-\d{4})\s+(\d{2}:\d{2})/i, type: 'vgm_cutoff', label: 'VGM Cut-off' },
    { rx: /FCL\s*delivery\s*cut[\-\s]*off[\s\S]{0,80}?(\d{2}-\w{3}-\d{4})\s+(\d{2}:\d{2})/i, type: 'fcl_delivery_cutoff', label: 'FCL Delivery Cut-off' },
  ];
  for (const { rx, type, label } of dlPatterns) {
    const m = text.match(rx);
    if (m) result.deadlines.push({ type, label, date: parseHLDate(m[1] + ' ' + m[2]) });
  }

  // ── Container info ──
  const summaryMatch = text.match(/Summary:\s*([\dx]+\s*\w+)/i);
  if (summaryMatch) result.container.summary = summaryMatch[1].trim();

  const contTypeMatch = text.match(/Container\s*Type\s+([^\n]+?)(?:\s+Commodity|\s+Customs)/i);
  if (contTypeMatch) result.container.type = contTypeMatch[1].trim();

  const commodityMatch = text.match(/Commodity\s+Description:\s*(.+?)(?:\s+Gross\s+Weight|\s+Customs)/i);
  if (commodityMatch) result.commodity = commodityMatch[1].trim();

  const grossMatch = text.match(/Gross\s*Weight:\s*([\d,\.]+)\s*(\w+)/i);
  if (grossMatch) result.container.grossWeight = grossMatch[1].replace(',', '.') + ' ' + grossMatch[2];

  const emptyPickup = text.match(/Empty\s*pick\s*up\s*date\/time\s+(\d{2}-\w{3}-\d{4})/i);
  if (emptyPickup) result.container.emptyPickupDate = parseHLDate(emptyPickup[1]);

  return result;
}

// ─── MSC Parser ─────────────────────────────────────────────────────────────

export function parseMSCBooking(text) {
  if (!text) return null;

  const isMSC = /MSC\s*(MEDITERRANEAN|FINLAND)/i.test(text) || /MEDU[A-Z]{2}\d+/i.test(text) || /msc\.com/i.test(text);
  if (!isMSC) return null;

  const result = {
    carrier: 'MSC',
    docType: 'booking_confirmation',
    references: {},
    routing: [],
    deadlines: [],
    container: {},
    commodity: null,
  };

  // ── References ──
  const ref = (rx) => { const m = text.match(rx); return m ? m[1].trim() : null; };
  result.references.bookingReference = ref(/BOOKING\s*REFERENCE[\s\S]*?(\d{2}[A-Z]{2}\d+)/i);
  result.references.swbNumber = ref(/ORIGINAL\/SEA\s*WAYBILL[\s\S]*?NUMBER[\s:]*(\S+)/i);
  result.references.customerReference = ref(/CUSTOMER\s*REFERENCE(?:\s*NUMBER)?[\s:]*(.+?)(?:\n|GATE|PURCHASE)/i);
  result.references.bookingDate = ref(/BOOKING\s*DATE[\s:]*([\d\/]+)/i);

  // ── Routing ──
  const pol = ref(/PORT\s*OF\s*LOADING[\s:]*([A-Z\s]+?)(?:\n|VESSEL|EST)/i);
  const vessel1 = ref(/VESSEL\s*(?:NAME)?\s*(?:\/\s*FLAG)?[\s:]*([^\n(]+?)(?:\s*\(|\s*\/\s*[A-Z]{2}\b)/i);
  const voy1 = ref(/VOYAGE\s*(?:NUMBER)?[\s:]*(\S+)/i);

  const arrDepMatch = text.match(/EST\.\s*TIME\s*OF\s*ARRIVAL\/DEPARTURE[\s:]*([\d\/]+\s*[\d:]+)\s+([\d\/]+\s*[\d:]+)/i);
  const loadingETD = arrDepMatch ? parseMSCDate(arrDepMatch[2]) : null;

  const ts1 = ref(/PORT\s*OF\s*TRANSHIPMENT\s*N.?1[\s:]*([A-Z\s]+?)(?:\n|CONNECTING)/i);
  const cv1 = ref(/CONNECTING\s*VESSEL\s*N.?1[\s\S]*?(?:\/\s*FLAG)?[\s:]*([^\n(]+?)(?:\s*\(|\s*\/\s*[A-Z]{2}\b)/i);
  const ts1ETD = ref(/PORT\s*OF\s*TRANSHIPMENT\s*N.?1[\s\S]*?EST\.\s*TIME\s*OF\s*DEPARTURE[\s:]*([\d\/]+\s*[\d:]+)/i);

  const ts2 = ref(/PORT\s*OF\s*TRANSHIPMENT\s*N.?2[\s:]*([A-Z\s]+?)(?:\n|CONNECTING)/i);
  const ts2ETD = ref(/PORT\s*OF\s*TRANSHIPMENT\s*N.?2[\s\S]*?EST\.\s*TIME\s*OF\s*DEPARTURE[\s:]*([\d\/]+\s*[\d:]+)/i);

  const pod = ref(/PORT\s*OF\s*DISCHARGE[\s:]*([A-Z\s\-]+?)(?:\n|TERMINAL|EST)/i);
  const podETA = ref(/EST\.\s*TIME\s*OF\s*ARRIVAL\s+([\d\/]+\s*[\d:]+)/i);

  if (pol) {
    result.routing.push({ from: pol, to: ts1 || pod || '', vessel: vessel1 || null, voyage: voy1 || null, etd: loadingETD, eta: null });
  }
  if (ts1 && (ts2 || pod)) {
    result.routing.push({ from: ts1, to: ts2 || pod, vessel: cv1 || null, voyage: null, etd: parseMSCDate(ts1ETD), eta: null });
  }
  if (ts2 && pod) {
    result.routing.push({ from: ts2, to: pod, vessel: null, voyage: null, etd: parseMSCDate(ts2ETD), eta: parseMSCDate(podETA) });
  } else if (pod && result.routing.length > 0) {
    result.routing[result.routing.length - 1].eta = parseMSCDate(podETA);
  }

  // ── Deadlines ──
  const cutoffs = [
    { rx: /SHIPPING\s*INSTRUCTIONS?\s*CUT[\-\s]*OFF[\s:]*([\d\/]+\s*[\d:]+)/i, type: 'si_closing', label: 'SI Cut-off' },
    { rx: /HAZ\/IMO\s*CUT[\-\s]*OFF[\s:]*([\d\/]+\s*[\d:]+)/i, type: 'haz_cutoff', label: 'HAZ/IMO Cut-off' },
    { rx: /VERIFIED\s*GROSS\s*MASS[\s\S]{0,40}?CUT[\-\s]*OFF[\s:]*([\d\/]+\s*[\d:]+)/i, type: 'vgm_cutoff', label: 'VGM (SOLAS) Cut-off' },
    { rx: /SPECIAL\s*CUT[\-\s]*OFF\s*\(\s*MRN\s*\)[\s:]*([\d\/]+\s*[\d:]+)/i, type: 'mrn_cutoff', label: 'MRN Cut-off' },
  ];
  for (const { rx, type, label } of cutoffs) {
    const m = text.match(rx);
    if (m) result.deadlines.push({ type, label, date: parseMSCDate(m[1]) });
  }

  // ── Container info ──
  const totalMatch = text.match(/TOTAL\s*CONTAINER\s*\(?S?\)?[\s:]*(\d+)/i);
  if (totalMatch) result.container.count = +totalMatch[1];
  const equipMatch = text.match(/EQUIP(?:MENT)?\.?\s*TYPE[^:]*[\s:]*(\w+)\s*(?:QUANTITY[\s:]*)?(\d+)?/i);
  if (equipMatch) { result.container.equipType = equipMatch[1]; if (equipMatch[2]) result.container.count = +equipMatch[2]; }
  const cargoDesc = ref(/CARGO\s*DESCRIPTION[\s\S]{0,20}?([A-Z][A-Z\s,]+?)(?:\s+HS\s*CODE|\s+\d)/i);
  if (cargoDesc) result.commodity = cargoDesc;

  return result;
}

// ─── Generic dispatcher ─────────────────────────────────────────────────────

export function parseBookingConfirmation(text) {
  if (!text) return null;
  return parseHapagLloydBooking(text) || parseMSCBooking(text) || null;
}

// ─── Map parsed booking → shipment field updates ────────────────────────────

export function bookingToShipmentUpdates(parsed) {
  if (!parsed) return null;

  const updates = {};
  const firstLeg = parsed.routing[0];
  const lastLeg = parsed.routing[parsed.routing.length - 1];

  updates.carrier = parsed.carrier;

  if (firstLeg?.from) updates.origin = firstLeg.from;
  if (lastLeg?.to) updates.destination = lastLeg.to;
  if (firstLeg?.etd) updates.etd = isoDate(firstLeg.etd);
  if (lastLeg?.eta) updates.eta = isoDate(lastLeg.eta);
  if (firstLeg?.vessel) updates.vessel = firstLeg.vessel;
  if (firstLeg?.voyage) updates.voyage = firstLeg.voyage;

  // Deduplicated routing string
  if (parsed.routing.length > 0) {
    const ports = [parsed.routing[0].from];
    for (const leg of parsed.routing) {
      if (leg.to && leg.to !== ports[ports.length - 1]) ports.push(leg.to);
    }
    updates.routing = ports.join(' → ');
  }

  // Carrier booking number — stored separately, does NOT overwrite shipment ref
  if (parsed.carrier === 'Hapag-Lloyd') {
    if (parsed.references.ourReference) updates.carrierBookingNumber = parsed.references.ourReference;
    if (parsed.references.yourReference) updates.customerRef = parsed.references.yourReference;
    if (parsed.references.blNumber) updates.blNumber = parsed.references.blNumber;
    if (parsed.references.quotationNumber) updates.quotationNumber = parsed.references.quotationNumber;
  } else if (parsed.carrier === 'MSC') {
    if (parsed.references.bookingReference) updates.carrierBookingNumber = parsed.references.bookingReference;
    if (parsed.references.customerReference) updates.customerRef = parsed.references.customerReference;
    if (parsed.references.swbNumber) updates.blNumber = parsed.references.swbNumber;
  }

  // Container
  if (parsed.container.count) updates.containerCount = parsed.container.count;
  if (parsed.container.equipType) {
    const typeMap = { '20DV': '20GP', '40DV': '40GP', '40HC': '40HC', '45GP': '45HC', '20RF': '20RE', '40RF': '40RE' };
    updates.containerTypeId = typeMap[parsed.container.equipType] || parsed.container.equipType;
  }
  if (parsed.container.summary) {
    const sm = parsed.container.summary.match(/(\d+)\s*x?\s*(\w+)/i);
    if (sm) { updates.containerCount = +sm[1]; updates.containerTypeId = sm[2]; }
  }

  // Milestones from deadlines
  updates.milestones = parsed.deadlines.map(d => ({
    id: d.type + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
    label: d.label,
    date: isoDate(d.date),
    dateTime: d.date,
    type: d.type,
    done: false,
    source: 'booking_confirmation',
  }));

  // Add ETD/ETA as milestones from routing legs
  parsed.routing.forEach((leg, i) => {
    if (leg.etd) {
      updates.milestones.push({
        id: `leg_dep_${i}_${Date.now()}`,
        label: i === 0 ? `ETD ${leg.from}` : `Depart ${leg.from}`,
        date: isoDate(leg.etd), dateTime: leg.etd,
        type: i === 0 ? 'etd_origin' : 'transhipment_departure',
        done: false, source: 'booking_confirmation',
      });
    }
    if (leg.eta && i === parsed.routing.length - 1) {
      updates.milestones.push({
        id: `leg_arr_${i}_${Date.now()}`,
        label: `ETA ${leg.to}`,
        date: isoDate(leg.eta), dateTime: leg.eta,
        type: 'eta_destination',
        done: false, source: 'booking_confirmation',
      });
    }
  });

  updates.milestones.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  updates._parsedBooking = parsed;

  return updates;
}
