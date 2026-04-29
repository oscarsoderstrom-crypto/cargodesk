// bookingParsers.js — Carrier-specific booking confirmation parsers
// Extracts: references, routing legs, deadlines/cut-offs, container info, vessel/voyage

// ─── Date helpers ───────────────────────────────────────────────────────────

function parseHLDate(str) {
  // Hapag-Lloyd: "02-May-2026 09:00" or "02-Apr-2026"
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
  // MSC: "21/04/2026 12:00" or "30/03/2026"
  if (!str) return null;
  const m = str.trim().match(/(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2}:\d{2})?/);
  if (!m) return null;
  const [hh, mm] = m[4] ? m[4].split(':').map(Number) : [0, 0];
  return new Date(+m[3], +m[2] - 1, +m[1], hh, mm).toISOString();
}

function isoDate(d) {
  return d ? new Date(d).toISOString().slice(0, 10) : null;
}

// ─── Hapag-Lloyd Parser ─────────────────────────────────────────────────────

export function parseHapagLloydBooking(text) {
  if (!text) return null;

  // Detect carrier
  const isHL = /hapag.?lloyd/i.test(text) || /HLCU/i.test(text) || /booking\s*confirmation.*original/i.test(text);
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

  // ── References ──
  const refPatterns = [
    [/Our\s*Reference[:\s]*(\S+)/i, 'ourReference'],
    [/Your\s*Reference[:\s]*(\S+)/i, 'yourReference'],
    [/BL\/SWB\s*No[^:]*[:\s]*(\S+)/i, 'blNumber'],
    [/Quotation\s*No[^:]*[:\s]*(\S+)/i, 'quotationNumber'],
    [/Booking\s*Date[:\s]*([\d\-\w]+)/i, 'bookingDate'],
    [/Date\s*of\s*Issue[:\s]*([\d\-\w]+)/i, 'issueDate'],
  ];
  for (const [rx, key] of refPatterns) {
    const m = text.match(rx);
    if (m) result.references[key] = m[1].trim();
  }

  // ── Routing legs ──
  // Pattern: "From: ORIGIN → To: DEST" + "By: Vessel NAME, Voy. No: X, ETD: date, ETA: date"
  const routingBlocks = text.split(/(?=From:)/gi).filter(b => /From:/i.test(b));
  for (const block of routingBlocks) {
    const from = block.match(/From:\s*(.+?)(?:\s*→|\s*To:)/i)?.[1]?.trim();
    const to = block.match(/To:\s*(.+?)(?:\n|By:)/i)?.[1]?.trim();
    const vessel = block.match(/(?:By:.*?Vessel|Vessel)\s+([^,\n]+)/i)?.[1]?.trim();
    const voyage = block.match(/Voy(?:age)?\.?\s*(?:No)?[:\s]*([^\s,]+)/i)?.[1]?.trim();
    const etdStr = block.match(/ETD[:\s]*([\d\-\w]+\s*\d{2}:\d{2})/i)?.[1];
    const etaStr = block.match(/ETA[:\s]*([\d\-\w]+\s*\d{2}:\d{2})/i)?.[1];

    if (from && to) {
      result.routing.push({
        from: cleanPort(from),
        to: cleanPort(to),
        vessel: vessel || null,
        voyage: voyage || null,
        etd: parseHLDate(etdStr),
        eta: parseHLDate(etaStr),
      });
    }
  }

  // Table-style routing — HL PDFs use a multi-column table where port name/code
  // and vessel info span several lines each. Instead of parsing the table structure,
  // extract the key fields directly from the full text.
  if (result.routing.length === 0) {
    // Extract all 5-letter port codes in order of appearance → origin, ...transshipments, destination
    const portCodeMatches = [...text.matchAll(/\(([A-Z]{5})\)/g)];
    const portCodes = [...new Set(portCodeMatches.map(m => m[1]))]; // dedupe, preserve order

    // Extract vessel names — HL format: "Vessel\nVESSEL NAME\nDP Voyage:" or "Vessel VESSEL NAME"
    const vesselMatches = [...text.matchAll(/Vessel\s*\n\s*([A-Z][A-Z\s]+?)(?:\n|DP\s*Voyage)/gi)];
    const vessels = vesselMatches.map(m => m[1].trim());

    // Extract voyage numbers — "Voy. No: UNIF 1226" (may have letters + digits)
    const voyMatches = [...text.matchAll(/Voy\.\s*No[:\s]*(\S+(?:\s+\d+)?)/gi)];
    const voyages = voyMatches.map(m => m[1].trim());

    // Extract IMO numbers in order of appearance
    const imoMatches = [...text.matchAll(/IMO\s*No[:\s]*(\d{6,})/gi)];
    const imos = imoMatches.map(m => m[1]);

    // Extract all dates in order
    const allDates = [...text.matchAll(/(\d{2}-\w{3}-\d{4})\s*(\d{2}:\d{2})?/g)]
      .map(m => parseHLDate(m[1] + (m[2] ? ' ' + m[2] : '')))
      .filter(Boolean);

    // Build routing legs from port codes
    if (portCodes.length >= 2) {
      for (let i = 0; i < portCodes.length - 1; i++) {
        result.routing.push({
          from: portCodes[i],
          to:   portCodes[i + 1],
          vessel: vessels[i] || vessels[0] || null,
          voyage: voyages[i] || voyages[0] || null,
          imo:    imos[i] || imos[0] || null,
          etd:    allDates[i * 2] || allDates[0] || null,
          eta:    allDates[i * 2 + 1] || allDates[1] || null,
        });
      }
    }

    // Store all IMOs on the result for easy access in bookingToShipmentUpdates
    if (imos.length > 0) result.imoNumber = imos[0];
  }

  // Global IMO fallback — ensure result.imoNumber is always set if any IMO appears in the text
  if (!result.imoNumber) {
    result.imoNumber = text.match(/IMO\s*No[:\s]*(\d{6,})/i)?.[1] || null;
  }

  // ── Deadlines ──
  const deadlinePatterns = [
    { rx: /Shipping\s*instruction\s*closing[^]*?(\d{2}-\w{3}-\d{4}\s*\d{2}:\d{2})/i, type: 'si_closing', label: 'SI Closing' },
    { rx: /VGM\s*cut[\-\s]*off[^]*?(\d{2}-\w{3}-\d{4}\s*\d{2}:\d{2})/i, type: 'vgm_cutoff', label: 'VGM Cut-off' },
    { rx: /FCL\s*delivery\s*cut[\-\s]*off[^]*?(\d{2}-\w{3}-\d{4}\s*\d{2}:\d{2})/i, type: 'fcl_delivery_cutoff', label: 'FCL Delivery Cut-off' },
  ];
  for (const { rx, type, label } of deadlinePatterns) {
    const m = text.match(rx);
    if (m) {
      result.deadlines.push({ type, label, date: parseHLDate(m[1]) });
    }
  }

  // ── Container info ──
  const summaryMatch = text.match(/Summary[:\s]*([\dx]+\s*\w+)/i);
  if (summaryMatch) result.container.summary = summaryMatch[1].trim();

  const contTypeMatch = text.match(/Container\s*Type[:\s]*([^\n]+)/i);
  if (contTypeMatch) result.container.type = contTypeMatch[1].trim();

  const commodityMatch = text.match(/Commodity[:\s]*(.+?)(?:Gross|$)/i);
  if (commodityMatch) result.commodity = commodityMatch[1].trim();

  const grossMatch = text.match(/Gross\s*Weight[:\s]*([\d,\.]+)\s*(\w+)/i);
  if (grossMatch) result.container.grossWeight = grossMatch[1].replace(',', '.') + ' ' + grossMatch[2];

  const emptyPickup = text.match(/Empty\s*pick\s*up[:\s]*([\d\-\w]+)/i);
  if (emptyPickup) result.container.emptyPickupDate = parseHLDate(emptyPickup[1]);

  const depotMatch = text.match(/Empty\s*pick\s*up\s*depot[:\s]*([^\n]+)/i) ||
                     text.match(/pick\s*up\s*depot[:\s]*([^\n]+)/i);
  if (depotMatch) result.container.emptyPickupDepot = depotMatch[1].trim();

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
  const refPatterns = [
    [/BOOKING\s*REFERENCE[:\s]*(\S+)/i, 'bookingReference'],
    [/ORIGINAL\/SEA\s*WAYBILL[^]*?NUMBER[:\s]*(\S+)/i, 'swbNumber'],
    [/CUSTOMER\s*REFERENCE(?:\s*NUMBER)?[:\s]*(.+)/i, 'customerReference'],
    [/BOOKING\s*DATE[:\s]*([\d\/]+)/i, 'bookingDate'],
    [/SERVICE\s*CONTRACT\/RATE\s*REF[^:]*[:\s]*(\S+)/i, 'serviceContract'],
    [/EDI\s*TRANSACTION[^:]*[:\s]*(\S+)/i, 'ediTransaction'],
  ];
  for (const [rx, key] of refPatterns) {
    const m = text.match(rx);
    if (m) result.references[key] = m[1].trim();
  }

  // ── Routing ──
  // Port of Loading
  const pol = text.match(/PORT\s*OF\s*LOADING[:\s]*([A-Z\s]+?)(?:\n|VESSEL)/i)?.[1]?.trim();
  
  // First vessel
  const vessel1 = text.match(/VESSEL\s*(?:NAME)?\s*(?:\/\s*FLAG)?[:\s]*([^\n(]+?)(?:\s*\(|\s*\/\s*[A-Z]{2}\b)/i)?.[1]?.trim();
  const voy1 = text.match(/VOYAGE\s*(?:NUMBER)?[:\s]*(\S+)/i)?.[1]?.trim();
  
  // ETD/ETA for loading port — MSC format: "EST. TIME OF ARRIVAL/DEPARTURE" followed by two dates
  const arrDepMatch = text.match(/EST\.\s*TIME\s*OF\s*ARRIVAL\/DEPARTURE[:\s]*([\d\/]+\s*[\d:]+)\s+([\d\/]+\s*[\d:]+)/i);
  const loadingETA = arrDepMatch ? parseMSCDate(arrDepMatch[1]) : null;
  const loadingETD = arrDepMatch ? parseMSCDate(arrDepMatch[2]) : null;

  // Transhipment ports
  const ts1 = text.match(/PORT\s*OF\s*TRANSHIPMENT\s*N[°*]?1[:\s]*([A-Z\s]+?)(?:\n|CONNECTING)/i)?.[1]?.trim();
  const cv1 = text.match(/CONNECTING\s*VESSEL\s*N[°*]?1\s*(?:\/\s*FLAG)?[:\s]*([^\n(]+?)(?:\s*\(|\s*\/\s*[A-Z]{2}\b)/i)?.[1]?.trim();
  const cv1Voy = text.match(/CONNECTING\s*VESSEL\s*N[°*]?1[^]*?VOYAGE\s*(?:NUMBER)?[:\s]*(\S+)/i)?.[1]?.trim();
  const ts1ETD = text.match(/PORT\s*OF\s*TRANSHIPMENT\s*N[°*]?1[^]*?EST\.\s*TIME\s*OF\s*DEPARTURE[:\s]*([\d\/]+\s*[\d:]+)/i)?.[1];

  const ts2 = text.match(/PORT\s*OF\s*TRANSHIPMENT\s*N[°*]?2[:\s]*([A-Z\s]+?)(?:\n|CONNECTING)/i)?.[1]?.trim();
  const cv2 = text.match(/CONNECTING\s*VESSEL\s*N[°*]?2\s*(?:\/\s*FLAG)?[:\s]*([^\n(]+?)(?:\s*\(|\s*\/\s*[A-Z]{2}\b)/i)?.[1]?.trim();
  const ts2ETD = text.match(/PORT\s*OF\s*TRANSHIPMENT\s*N[°*]?2[^]*?EST\.\s*TIME\s*OF\s*DEPARTURE[:\s]*([\d\/]+\s*[\d:]+)/i)?.[1];

  // Port of Discharge
  const pod = text.match(/PORT\s*OF\s*DISCHARGE[:\s]*([A-Z\s\-]+?)(?:\n|TERMINAL|EST)/i)?.[1]?.trim();
  const podETA = text.match(/PORT\s*OF\s*DISCHARGE[^]*?EST\.\s*TIME\s*OF\s*ARRIVAL[:\s]*([\d\/]+\s*[\d:]+)/i)?.[1];

  // Fallback: find dates near port of discharge
  const podETAFallback = text.match(/EST\.\s*TIME\s*OF\s*ARRIVAL\s+([\d\/]+\s*[\d:]+)/i)?.[1];

  // Build routing legs
  if (pol) {
    const firstLeg = {
      from: pol,
      to: ts1 || pod || '',
      vessel: vessel1 || null,
      voyage: voy1 || null,
      etd: loadingETD,
      eta: null,
    };
    result.routing.push(firstLeg);
  }

  if (ts1 && (ts2 || pod)) {
    result.routing.push({
      from: ts1,
      to: ts2 || pod,
      vessel: cv1 || null,
      voyage: cv1Voy || null,
      etd: parseMSCDate(ts1ETD),
      eta: null,
    });
  }

  if (ts2 && pod) {
    result.routing.push({
      from: ts2,
      to: pod,
      vessel: cv2 || null,
      voyage: null,
      etd: parseMSCDate(ts2ETD),
      eta: parseMSCDate(podETA || podETAFallback),
    });
  } else if (pod && result.routing.length > 0) {
    // Set final ETA on last leg
    const lastLeg = result.routing[result.routing.length - 1];
    if (lastLeg.to === pod || !lastLeg.eta) {
      lastLeg.eta = parseMSCDate(podETA || podETAFallback);
    }
  }

  // ── Deadlines / Cut-offs ──
  const cutoffPatterns = [
    { rx: /SHIPPING\s*INSTRUCTIONS?\s*CUT[\-\s]*OFF[:\s]*([\d\/]+\s*[\d:]+)/i, type: 'si_closing', label: 'SI Cut-off' },
    { rx: /HAZ\/IMO\s*CUT[\-\s]*OFF[:\s]*([\d\/]+\s*[\d:]+)/i, type: 'haz_cutoff', label: 'HAZ/IMO Cut-off' },
    { rx: /VERIFIED\s*GROSS\s*MASS[^]*?CUT[\-\s]*OFF[:\s]*([\d\/]+\s*[\d:]+)/i, type: 'vgm_cutoff', label: 'VGM (SOLAS) Cut-off' },
    { rx: /SPECIAL\s*CUT[\-\s]*OFF\s*\(\s*MRN\s*\)[:\s]*([\d\/]+\s*[\d:]+)/i, type: 'mrn_cutoff', label: 'MRN Cut-off' },
  ];
  for (const { rx, type, label } of cutoffPatterns) {
    const m = text.match(rx);
    if (m) {
      result.deadlines.push({ type, label, date: parseMSCDate(m[1]) });
    }
  }

  // Gate-in
  const gateInFirst = text.match(/GATE[\-\s]*IN[^]*?First\s*Receiving[^]*?([\d\/]+\s*[\d:]+)/i)?.[1];
  const gateInCutoff = text.match(/GATE[\-\s]*IN[^]*?Cut[\-\s]*off[^]*?([\d\/]+\s*[\d:]+)/i) ||
                       text.match(/GATE[\-\s]*IN[^]*?CUT[\-\s]*OFF\s*\(?Date\/Time\)?[:\s]*([\d\/]+\s*[\d:]+)/i);
  if (gateInFirst) {
    result.deadlines.push({ type: 'gate_in_first', label: 'Gate-in First Receiving', date: parseMSCDate(gateInFirst) });
  }
  if (gateInCutoff) {
    result.deadlines.push({ type: 'gate_in_cutoff', label: 'Gate-in Cut-off', date: parseMSCDate(gateInCutoff[1]) });
  }

  // ── Container info ──
  const totalMatch = text.match(/TOTAL\s*CONTAINER\s*\(?S?\)?[:\s]*(\d+)/i);
  if (totalMatch) result.container.count = +totalMatch[1];

  const teusMatch = text.match(/TEUS?[:\s]*(\d+)/i);
  if (teusMatch) result.container.teus = +teusMatch[1];

  const socMatch = text.match(/S\.?O\.?C[:\s]*(\d+)/i);
  if (socMatch) result.container.soc = +socMatch[1];

  const equipMatch = text.match(/EQUIP(?:MENT)?\.?\s*TYPE[^:]*[:\s]*(\w+)\s*(?:QUANTITY[:\s]*)?(\d+)?/i) ||
                     text.match(/EQUIP(?:MENT)?[:\s]*(\w+)[,\s]+Quantity\s+(\d+)/i);
  if (equipMatch) {
    result.container.equipType = equipMatch[1];
    if (equipMatch[2]) result.container.count = +equipMatch[2];
  }

  // Commodity
  const cargoDesc = text.match(/CARGO\s*DESCRIPTION[^]*?([A-Z][A-Z\s,]+?)(?:\s+HS\s*CODE|\s+\d)/i)?.[1]?.trim();
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

  // Origin/destination from first/last routing leg
  if (firstLeg?.from) updates.origin = cleanPort(firstLeg.from);
  if (lastLeg?.to) updates.destination = cleanPort(lastLeg.to);

  // ETD = first leg departure, ETA = last leg arrival
  if (firstLeg?.etd) updates.etd = isoDate(firstLeg.etd);
  if (lastLeg?.eta) updates.eta = isoDate(lastLeg.eta);

  // Vessel + voyage + IMO from first ocean leg
  if (firstLeg?.vessel) updates.vessel = firstLeg.vessel;
  if (firstLeg?.voyage) updates.voyage = firstLeg.voyage;
  if (firstLeg?.imo)    updates.imoNumber = firstLeg.imo;
  // Also try the top-level imoNumber set by the global fallback
  if (!updates.imoNumber && parsed.imoNumber) updates.imoNumber = parsed.imoNumber;

  // Full routing string
  if (parsed.routing.length > 0) {
    updates.routing = parsed.routing
      .map(l => `${cleanPort(l.from)} → ${cleanPort(l.to)}`)
      .join(' → ')
      .replace(/ → ([^→]+) → \1/g, ' → $1'); // dedupe
  }

  // Booking number / reference
  if (parsed.carrier === 'Hapag-Lloyd') {
    if (parsed.references.ourReference) updates.bookingNumber = parsed.references.ourReference;
    if (parsed.references.yourReference) updates.customerRef = parsed.references.yourReference;
    if (parsed.references.blNumber) updates.blNumber = parsed.references.blNumber;
    if (parsed.references.quotationNumber) updates.quotationNumber = parsed.references.quotationNumber;
  } else if (parsed.carrier === 'MSC') {
    if (parsed.references.bookingReference) updates.bookingNumber = parsed.references.bookingReference;
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
    // "1x45GP" → count + type
    const sm = parsed.container.summary.match(/(\d+)\s*x?\s*(\w+)/i);
    if (sm) {
      updates.containerCount = +sm[1];
      updates.containerTypeId = sm[2];
    }
  }

  // Milestones from deadlines
  updates.milestones = parsed.deadlines.map(d => ({
    id: d.type + '_' + Date.now(),
    label: d.label,
    date: isoDate(d.date),
    dateTime: d.date,
    type: d.type,
    completed: false,
    source: 'booking_confirmation',
  }));

  // Add routing leg ETDs as milestones
  parsed.routing.forEach((leg, i) => {
    if (i > 0 && leg.etd) {
      updates.milestones.push({
        id: `ts_dep_${i}_${Date.now()}`,
        label: `Depart ${cleanPort(leg.from)}`,
        date: isoDate(leg.etd),
        dateTime: leg.etd,
        type: 'transhipment_departure',
        completed: false,
        source: 'booking_confirmation',
      });
    }
  });

  // Store full parsed data for reference
  updates._parsedBooking = parsed;

  return updates;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function cleanPort(str) {
  if (!str) return '';
  // Remove trailing port codes like (FIHEL) and extra whitespace
  return str.replace(/\s*\([A-Z]{5}\)/, '').replace(/\s+/g, ' ').trim();
}
