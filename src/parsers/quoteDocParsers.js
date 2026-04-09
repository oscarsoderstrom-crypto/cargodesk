// quoteDocParsers.js — Parse carrier quote PDFs (structured table formats)
// Currently supports: Hapag-Lloyd quotation documents

export function parseHapagQuotePdf(text) {
  if (!text) return null;
  const isHLQuote = /Hapag[\-\s]*Lloyd/i.test(text) && /Quotation\s*(Document|number)/i.test(text);
  if (!isHLQuote) return null;

  const result = {
    carrier: 'Hapag-Lloyd', docType: 'carrier_quote',
    quoteNumber: null, validFrom: null, validTo: null,
    origin: null, destination: null, via: null, transitDays: null, commodity: null,
    containerSizes: [], charges: [],
  };

  const ref = (rx) => { const m = text.match(rx); return m ? m[1].trim() : null; };
  result.quoteNumber = ref(/Quotation\s*number\s+(\S+)/i);
  result.validFrom = ref(/Valid\s*from\s+(\d{2}\s+\w{3}\s+\d{2})/i);
  result.validTo = ref(/Valid\s*to\s+(\d{2}\s+\w{3}\s+\d{2})/i);

  const fromMatch = text.match(/From\s+([A-Z][A-Z\s,]+?)(?:\s+P\s*O\s*R\s*T|\s+To\b)/i);
  if (fromMatch) result.origin = fromMatch[1].trim();
  const toMatch = text.match(/To\s+([A-Z][A-Z\s,]+?)(?:\s+P\s*O\s*R\s*T|\s+via\b)/i);
  if (toMatch) result.destination = toMatch[1].trim();
  const viaMatch = text.match(/via\s+([A-Z][A-Z\s,]+?)(?:\s+Estimated|\s+For\b)/i);
  if (viaMatch) result.via = viaMatch[1].trim();
  const transitMatch = text.match(/Estimated\s*Transportation\s*Days\s+(\d+)/i);
  if (transitMatch) result.transitDays = +transitMatch[1];
  const commodityMatch = text.match(/Commodity\s+(\S+)/i);
  if (commodityMatch) result.commodity = commodityMatch[1];

  if (/20.STD\s+40.STD\s+40.HC/i.test(text)) result.containerSizes = ["20'STD", "40'STD", "40'HC"];
  else if (/20.STD\s+40.HC/i.test(text)) result.containerSizes = ["20'STD", "40'HC"];
  else if (/40.HC/i.test(text)) result.containerSizes = ["40'HC"];

  const chargePatterns = [
    { rx: /Ocean\s*Freight\s+(USD|EUR)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/i, desc: 'Ocean Freight', category: 'transport' },
    { rx: /Emission\s*Allowance\s+(USD|EUR)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/i, desc: 'Emission Allowance Surcharge', category: 'transport' },
    { rx: /Marine\s*Fuel\s*Recovery\s+(USD|EUR)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/i, desc: 'Marine Fuel Recovery (MFR)', category: 'transport' },
    { rx: /Emergency\s*Fuel\s*Surcharge\s+(USD|EUR)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/i, desc: 'Emergency Fuel Surcharge', category: 'transport' },
    { rx: /Wharfage\s*Destination\s+(USD|EUR)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/i, desc: 'Wharfage Destination', category: 'destination' },
    { rx: /Equipment\s*Maintenance\s*Fee\s+(USD|EUR)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/i, desc: 'Equipment Maintenance Fee', category: 'destination' },
    { rx: /Terminal\s*Handling\s*(?:Charge\s*)?Orig[^\s]*\s+(USD|EUR)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/i, desc: 'THC Origin', category: 'origin' },
    { rx: /Terminal\s*Handling\s*(?:Charge\s*)?Dest[^\s]*\s+(USD|EUR)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/i, desc: 'THC Destination', category: 'destination' },
    { rx: /Carrier\s*Security\s*Fee\s+(USD|EUR)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/i, desc: 'Carrier Security Fee', category: 'transport' },
    { rx: /BAF\s+(USD|EUR)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/i, desc: 'BAF', category: 'transport' },
    { rx: /CAF\s+(USD|EUR)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/i, desc: 'CAF', category: 'transport' },
    { rx: /LSS\s+(USD|EUR)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/i, desc: 'LSS', category: 'transport' },
    { rx: /ISPS\s+(USD|EUR)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/i, desc: 'ISPS', category: 'transport' },
  ];
  for (const { rx, desc, category } of chargePatterns) {
    const m = text.match(rx);
    if (m) {
      const amounts = {};
      const vals = [m[2], m[3], m[4]].map(v => parseInt(v.replace(/,/g, ''), 10));
      result.containerSizes.forEach((size, i) => { amounts[size] = vals[i] || vals[0]; });
      result.charges.push({ description: desc, currency: m[1].toUpperCase(), amounts, category, perUnit: 'per_container' });
    }
  }

  const perBlPatterns = [
    { rx: /Security\s*Manifest\s*Document\s*Fee:\s*(USD|EUR)\s*([\d,]+)\s*per\s*Bill/i, desc: 'Security Manifest Document Fee', category: 'transport' },
    { rx: /Document\s*Charge:\s*(USD|EUR)\s*([\d,]+)\s*per\s*Bill/i, desc: 'Documentation Fee', category: 'transport' },
    { rx: /B\/?L\s*Fee:\s*(USD|EUR)\s*([\d,]+)/i, desc: 'BL Fee', category: 'transport' },
  ];
  for (const { rx, desc, category } of perBlPatterns) {
    const m = text.match(rx);
    if (m) result.charges.push({ description: desc, currency: m[1].toUpperCase(), amount: parseInt(m[2].replace(/,/g, ''), 10), category, perUnit: 'per_bl' });
  }

  return result.charges.length > 0 ? result : null;
}

export function getChargesForSize(parsedQuote, containerSizeHint) {
  if (!parsedQuote || !parsedQuote.charges) return [];
  const sizeMap = { '20GP': "20'STD", '20DV': "20'STD", '40GP': "40'STD", '40DV': "40'STD", '40HC': "40'HC", '45GP': "40'HC", '45HC': "40'HC" };
  const targetSize = sizeMap[containerSizeHint] || "40'HC";

  return parsedQuote.charges.map(charge => {
    let amount;
    if (charge.amounts) {
      amount = charge.amounts[targetSize] || charge.amounts["40'HC"] || charge.amounts["40'STD"] || Object.values(charge.amounts)[0];
    } else {
      amount = charge.amount;
    }
    return { description: charge.description, currency: charge.currency, amount, category: charge.category, perUnit: charge.perUnit };
  });
}
