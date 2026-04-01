/**
 * Carrier-specific document parsers.
 *
 * Each parser attempts to extract structured data from raw PDF text.
 * The approach: try each carrier parser in order, return the first match.
 * If none match, return a generic parse with whatever we can find.
 */

// ---- UTILITY HELPERS ----

function findMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match;
  }
  return null;
}

function findAllMatches(text, pattern) {
  const results = [];
  let match;
  const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  while ((match = regex.exec(text)) !== null) {
    results.push(match);
  }
  return results;
}

function extractDates(text) {
  const dates = [];
  // ISO format: 2026-03-15
  const isoPattern = /\b(\d{4}-\d{2}-\d{2})\b/g;
  let m;
  while ((m = isoPattern.exec(text)) !== null) dates.push(m[1]);

  // European format: 15.03.2026 or 15/03/2026
  const euPattern = /\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/g;
  while ((m = euPattern.exec(text)) !== null) {
    const day = m[1].padStart(2, '0');
    const month = m[2].padStart(2, '0');
    dates.push(`${m[3]}-${month}-${day}`);
  }

  // Written format: 15 Mar 2026, March 15, 2026
  const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
  const writtenPattern = /\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[.,]?\s+(\d{4})\b/gi;
  while ((m = writtenPattern.exec(text)) !== null) {
    const month = months[m[2].toLowerCase().slice(0, 3)];
    if (month) dates.push(`${m[3]}-${month}-${m[1].padStart(2, '0')}`);
  }

  return [...new Set(dates)].sort();
}

function extractAmounts(text) {
  const amounts = [];
  // Match patterns like EUR 7,200 or USD 1,800.00 or 7200 EUR
  const pattern = /(EUR|USD|SEK|GBP)\s*[=:]?\s*([\d.,]+)|([\d.,]+)\s*(EUR|USD|SEK|GBP)/gi;
  let m;
  while ((m = pattern.exec(text)) !== null) {
    const currency = (m[1] || m[4]).toUpperCase();
    const rawAmount = (m[2] || m[3]).replace(/\s/g, '');
    // Handle both 7,200.00 and 7.200,00 formats
    let amount;
    if (rawAmount.includes(',') && rawAmount.includes('.')) {
      if (rawAmount.lastIndexOf(',') > rawAmount.lastIndexOf('.')) {
        amount = parseFloat(rawAmount.replace(/\./g, '').replace(',', '.'));
      } else {
        amount = parseFloat(rawAmount.replace(/,/g, ''));
      }
    } else if (rawAmount.includes(',')) {
      // Could be thousands separator (7,200) or decimal (7,20)
      const parts = rawAmount.split(',');
      if (parts[parts.length - 1].length === 3 || parts.length > 2) {
        amount = parseFloat(rawAmount.replace(/,/g, ''));
      } else {
        amount = parseFloat(rawAmount.replace(',', '.'));
      }
    } else {
      amount = parseFloat(rawAmount);
    }
    if (!isNaN(amount) && amount > 0) {
      amounts.push({ currency, amount });
    }
  }
  return amounts;
}

function extractPorts(text) {
  // Common port/city names in logistics
  const portPatterns = /\b(Helsinki|Kotka|Hamina|Turku|Stockholm|Rotterdam|Hamburg|Bremerhaven|Antwerp|Felixstowe|Shanghai|Dalian|Qingdao|Ningbo|Busan|Singapore|Port Klang|Houston|Los Angeles|Long Beach|New York|Savannah|Charleston|Gothenburg|Oslo|Copenhagen|Gdansk|Riga|Tallinn|St\.\s*Petersburg)\b/gi;
  const ports = [];
  let m;
  while ((m = portPatterns.exec(text)) !== null) {
    const port = m[1].charAt(0).toUpperCase() + m[1].slice(1);
    if (!ports.includes(port)) ports.push(port);
  }
  return ports;
}

function extractContainerTypes(text) {
  const types = [];
  // Match: 1 x 40'HC, 2x20', 1 X 40' HC, etc.
  const pattern = /(\d+)\s*[xX×]\s*(\d{2})[''`]?\s*(HC|GP|OT|FR|RF|DV|DC)?/gi;
  let m;
  while ((m = pattern.exec(text)) !== null) {
    const qty = m[1];
    const size = m[2];
    const type = m[3] ? m[3].toUpperCase() : '';
    types.push(`${qty} x ${size}'${type}`);
  }
  return types;
}


// ---- CARRIER DETECTION ----

function detectCarrier(text) {
  const upper = text.toUpperCase();
  if (upper.includes('HAPAG-LLOYD') || upper.includes('HAPAG LLOYD') || /\bHAPAG\b/.test(upper)) return 'hapag-lloyd';
  if (upper.includes('MEDITERRANEAN SHIPPING') || /\bMSC\b/.test(upper)) return 'msc';
  if (/\bCOSCO\b/.test(upper) || upper.includes('COSCO SHIPPING')) return 'cosco';
  if (upper.includes('CMA CGM') || upper.includes('CMA-CGM')) return 'cma-cgm';
  if (/\bOOCL\b/.test(upper) || upper.includes('ORIENT OVERSEAS')) return 'oocl';
  if (/\bONE\b/.test(upper) && (upper.includes('OCEAN NETWORK') || upper.includes('ONE LINE'))) return 'one';
  if (upper.includes('WALLENIUS') || upper.includes('WILHELMSEN')) return 'wallenius';
  if (upper.includes('NORDICON')) return 'nordicon';
  if (upper.includes('FINNAIR')) return 'finnair';
  if (/\bDSV\b/.test(upper)) return 'dsv';
  if (/\bDHL\b/.test(upper)) return 'dhl';
  if (upper.includes('SCHENKER') || upper.includes('DB SCHENKER')) return 'schenker';
  if (upper.includes('KUEHNE') || upper.includes('K+N') || upper.includes('KÜHNE')) return 'kuehne-nagel';
  return null;
}


// ---- DOCUMENT TYPE DETECTION ----

function detectDocumentType(text) {
  const upper = text.toUpperCase();

  // Booking confirmation signals
  if (upper.includes('BOOKING CONFIRMATION') || upper.includes('BOOKING CONF') ||
      upper.includes('BOOKING NUMBER') || upper.includes('BOOKING REF') ||
      upper.includes('BKG NO') || upper.includes('BOOKING NO')) {
    return 'booking';
  }

  // Bill of lading signals
  if (upper.includes('BILL OF LADING') || upper.includes('B/L NO') ||
      upper.includes('BL NUMBER') || upper.includes('OCEAN BILL')) {
    return 'bl';
  }

  // Invoice signals
  if (upper.includes('INVOICE') || upper.includes('FAKTURA') || upper.includes('LASKU')) {
    return 'invoice';
  }

  // Packing list signals
  if (upper.includes('PACKING LIST') || upper.includes('PACKING SLIP')) {
    return 'packing_list';
  }

  // Customs signals
  if (upper.includes('CUSTOMS') || upper.includes('TULLI') || upper.includes('DECLARATION')) {
    return 'customs';
  }

  // Quote signals (check last as it's the broadest)
  if (upper.includes('QUOTATION') || upper.includes('QUOTE') || upper.includes('OFFER') ||
      upper.includes('TARJOUS') || upper.includes('RATE') || upper.includes('PRICING')) {
    return 'quote';
  }

  return 'other';
}


// ---- QUOTE NUMBER EXTRACTION ----

function extractQuoteNumber(text) {
  const patterns = [
    // Hapag-Lloyd: QT-HL-2026-8834 or similar
    /\b(QT[-_]?[A-Z]{2,4}[-_]?\d{4}[-_]?\d{2,6})\b/i,
    // MSC: QT-MSC-2026-0445
    /\b(QT[-_]MSC[-_]\d{4}[-_]\d{3,6})\b/i,
    // COSCO: COS-Q-2026-1145
    /\b(COS[-_]Q[-_]\d{4}[-_]\d{3,6})\b/i,
    // Generic: QUOTE-xxxx, QUO-xxxx
    /\b(QUOT?E?[-_]\d{4,10})\b/i,
    // Reference patterns: REF-xxx, REF: xxx
    /(?:quote|quotation|reference|ref)[:\s#]*([A-Z0-9][-A-Z0-9]{4,20})/i,
    // Numbered patterns like Q-2026-001234
    /\b(Q[-_]\d{4}[-_]\d{3,8})\b/i,
  ];

  const match = findMatch(text, patterns);
  return match ? (match[1] || match[0]).trim() : null;
}


// ---- BOOKING NUMBER EXTRACTION ----

function extractBookingNumber(text) {
  const patterns = [
    // Hapag-Lloyd booking: BKG-HL-443312
    /\b(BKG[-_][A-Z]{2,4}[-_]\d{4,10})\b/i,
    // MSC booking: BK-9912834
    /\b(BK[-_]\d{5,12})\b/i,
    // Generic booking number
    /(?:booking|bkg)\s*(?:no|number|ref|#|:)\s*[:]?\s*([A-Z0-9][-A-Z0-9]{4,20})/i,
    // Carrier booking formats
    /\b(\d{10,12})\b/,  // Pure numeric booking numbers (common for MSC, COSCO)
  ];

  const match = findMatch(text, patterns);
  return match ? (match[1] || match[0]).trim() : null;
}


// ---- QUOTE NUMBER REFERENCE IN BOOKINGS ----

function extractQuoteRefFromBooking(text) {
  const patterns = [
    /(?:quote|quotation|quot)\s*(?:ref|reference|no|number|#|:)\s*[:]?\s*([A-Z0-9][-A-Z0-9_]{4,25})/i,
    /(?:based on|referring to|ref to|re:?)\s*(?:quote|quotation)?\s*[:#]?\s*([A-Z0-9][-A-Z0-9_]{4,25})/i,
    /\b(QT[-_][A-Z0-9][-A-Z0-9_]{3,20})\b/i,
    /\b(COS[-_]Q[-_]\d{4}[-_]\d{3,6})\b/i,
  ];

  const match = findMatch(text, patterns);
  return match ? (match[1] || match[0]).trim() : null;
}


// ---- VESSEL / VOYAGE EXTRACTION ----

function extractVesselInfo(text) {
  const patterns = [
    /(?:vessel|ship|v\.|vsl)[:\s]+([A-Z][A-Za-z\s]{3,30}?)(?:\s+(?:voy|voyage|v\.)\s*[:\s]*([A-Z0-9]{2,10}))?/i,
    /(?:m\/?v|mv)\s+([A-Z][A-Za-z\s]{3,30}?)(?:\s+(?:voy|voyage)\s*[:\s]*([A-Z0-9]{2,10}))?/i,
  ];

  const match = findMatch(text, patterns);
  if (match) {
    return {
      vessel: match[1].trim(),
      voyage: match[2] ? match[2].trim() : null,
    };
  }
  return null;
}


// ---- MAIN PARSE FUNCTION ----

/**
 * Parse a PDF's extracted text and return structured data.
 *
 * @param {string} text - Raw text extracted from PDF
 * @param {string} fileName - Original filename (used as hint)
 * @returns {object} Parsed document data
 */
export function parseDocumentText(text, fileName = '') {
  const carrier = detectCarrier(text + ' ' + fileName);
  const docType = detectDocumentType(text + ' ' + fileName);
  const dates = extractDates(text);
  const amounts = extractAmounts(text);
  const ports = extractPorts(text);
  const containers = extractContainerTypes(text);
  const vesselInfo = extractVesselInfo(text);

  const result = {
    carrier,
    carrierLabel: formatCarrierName(carrier),
    documentType: docType,
    quoteNumber: null,
    bookingNumber: null,
    quoteReference: null,  // Quote number referenced IN a booking
    vessel: vesselInfo?.vessel || null,
    voyage: vesselInfo?.voyage || null,
    dates,
    amounts,
    ports,
    containers,
    origin: ports.length >= 1 ? ports[0] : null,
    destination: ports.length >= 2 ? ports[1] : null,
    confidence: 0,
  };

  // Extract identifiers based on document type
  if (docType === 'quote') {
    result.quoteNumber = extractQuoteNumber(text);
    result.confidence = result.quoteNumber ? 0.9 : 0.6;
  } else if (docType === 'booking') {
    result.bookingNumber = extractBookingNumber(text);
    result.quoteReference = extractQuoteRefFromBooking(text);
    result.confidence = result.bookingNumber ? 0.9 : 0.6;
  } else if (docType === 'bl') {
    result.bookingNumber = extractBookingNumber(text);
    result.confidence = 0.8;
  } else {
    // Try extracting both
    result.quoteNumber = extractQuoteNumber(text);
    result.bookingNumber = extractBookingNumber(text);
    result.confidence = 0.4;
  }

  // Boost confidence if we found a known carrier
  if (carrier) result.confidence = Math.min(result.confidence + 0.1, 1.0);

  return result;
}


/**
 * Try to match a booking confirmation to an existing quote by quote number.
 *
 * @param {object} parsedBooking - Parsed booking document
 * @param {Array} existingDocuments - Array of already-stored documents with parsedData
 * @returns {object|null} Matching quote document, or null
 */
export function matchBookingToQuote(parsedBooking, existingDocuments) {
  if (!parsedBooking.quoteReference) return null;

  const ref = parsedBooking.quoteReference.toUpperCase();

  return existingDocuments.find(doc => {
    if (doc.parsedData?.documentType !== 'quote') return false;
    const qNum = doc.parsedData?.quoteNumber?.toUpperCase();
    if (!qNum) return false;

    // Exact match
    if (qNum === ref) return true;

    // Partial match (booking might have abbreviated ref)
    if (qNum.includes(ref) || ref.includes(qNum)) return true;

    return false;
  }) || null;
}


// ---- DISPLAY HELPERS ----

function formatCarrierName(carrierId) {
  const names = {
    'hapag-lloyd': 'Hapag-Lloyd',
    'msc': 'MSC',
    'cosco': 'COSCO',
    'cma-cgm': 'CMA-CGM',
    'oocl': 'OOCL',
    'one': 'ONE',
    'wallenius': 'Wallenius Wilhelmsen',
    'nordicon': 'Nordicon',
    'finnair': 'Finnair Cargo',
    'dsv': 'DSV',
    'dhl': 'DHL',
    'schenker': 'DB Schenker',
    'kuehne-nagel': 'Kuehne+Nagel',
  };
  return names[carrierId] || carrierId || 'Unknown';
}

export function getDocTypeLabel(type) {
  const labels = {
    quote: 'Quote',
    booking: 'Booking',
    bl: 'Bill of Lading',
    invoice: 'Invoice',
    packing_list: 'Packing List',
    customs: 'Customs',
    other: 'Document',
  };
  return labels[type] || 'Document';
}

export function getDocTypeColor(type, T) {
  const colors = {
    quote: { text: T.amber, bg: T.amberBg },
    booking: { text: T.accent, bg: T.accentGlow },
    bl: { text: T.purple, bg: T.purpleBg },
    invoice: { text: T.green, bg: T.greenBg },
    packing_list: { text: T.text2, bg: T.bg3 },
    customs: { text: T.text2, bg: T.bg3 },
    other: { text: T.text2, bg: T.bg3 },
  };
  return colors[type] || colors.other;
}
