// documentIntelligence.js — Orchestrates document parsing pipeline
// Drop a PDF or .msg → detect type → parse → return structured updates

import { parseBookingConfirmation, bookingToShipmentUpdates } from './bookingParsers';
import { parseQuoteText, parseQuoteSubject, buildQuoteFromEmail } from './quoteParsers';
import { processMsgFile, htmlToText } from './msgParser';

// ─── File type detection ────────────────────────────────────────────────────

export function getFileType(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.msg')) return 'msg';
  if (name.endsWith('.eml')) return 'eml';
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'excel';
  if (name.endsWith('.csv')) return 'csv';
  return 'unknown';
}

// ─── Process a single dropped file ──────────────────────────────────────────

export async function processDroppedFile(file, existingShipment = null) {
  const fileType = getFileType(file);

  if (fileType === 'msg') {
    return processMsgDrop(file, existingShipment);
  }

  if (fileType === 'pdf') {
    // PDF handling — use existing pdfParser.js to get text, then run through booking parser
    // Returns a result object that the DocumentsTab can use
    return { fileType: 'pdf', file, needsPdfParse: true };
  }

  return { fileType, file, error: `Unsupported file type: ${fileType}` };
}

// ─── MSG file pipeline ──────────────────────────────────────────────────────

async function processMsgDrop(file, existingShipment) {
  const msg = await processMsgFile(file);
  if (!msg) return { fileType: 'msg', file, error: 'Could not parse .msg file' };

  const result = {
    fileType: 'msg',
    file,
    subject: msg.subject,
    sender: msg.sender,
    senderEmail: msg.senderEmail,
    bodyText: msg.bodyText,
    attachments: msg.attachments || [],
    documentRecord: {
      name: file.name,
      type: 'email',
      date: new Date().toISOString().slice(0, 10),
    },
    quote: null,
    shipmentUpdates: null,
  };

  // Try to parse as a quote email
  const subjectData = parseQuoteSubject(msg.subject);
  const quoteData = parseQuoteText(msg.bodyText);

  if (subjectData || (quoteData && quoteData.costs.length > 0)) {
    result.quote = buildQuoteFromEmail(msg.subject, msg.bodyText);
    if (result.quote && subjectData) {
      result.documentRecord.type = 'quote';
      // Set route info on document
      result.documentRecord.quoteOrigin = subjectData.origin;
      result.documentRecord.quoteDestination = subjectData.destination;
    }
  }

  // Check for PDF attachments (might be booking confirmations or quotes)
  result.pdfAttachments = msg.attachments.filter(a => a.isPdf);

  return result;
}

// ─── Process PDF text through booking parser ────────────────────────────────

export function processPdfText(rawText, existingShipment = null) {
  const result = {
    isBookingConfirmation: false,
    isQuote: false,
    bookingData: null,
    quoteData: null,
    shipmentUpdates: null,
  };

  // Try booking confirmation first
  const booking = parseBookingConfirmation(rawText);
  if (booking) {
    result.isBookingConfirmation = true;
    result.bookingData = booking;
    result.shipmentUpdates = bookingToShipmentUpdates(booking);

    // Track original ETD/ETA
    if (existingShipment && result.shipmentUpdates) {
      if (result.shipmentUpdates.etd && !existingShipment.originalETD) {
        result.shipmentUpdates.originalETD = result.shipmentUpdates.etd;
      }
      if (result.shipmentUpdates.eta && !existingShipment.originalETA) {
        result.shipmentUpdates.originalETA = result.shipmentUpdates.eta;
      }
    }

    return result;
  }

  // Try as a quote document
  const quoteData = parseQuoteText(rawText);
  if (quoteData && quoteData.costs.length > 0) {
    result.isQuote = true;
    result.quoteData = quoteData;
  }

  return result;
}

// ─── Apply booking updates to a shipment ────────────────────────────────────

export function applyBookingToShipment(shipment, updates) {
  if (!updates) return shipment;

  const updated = { ...shipment };

  // Apply field updates
  const fields = ['carrier', 'origin', 'destination', 'etd', 'eta', 'vessel', 'voyage',
                  'routing', 'bookingNumber', 'customerRef', 'blNumber', 'quotationNumber',
                  'containerCount', 'containerTypeId', 'imoNumber', 'schedule'];

  for (const field of fields) {
    if (updates[field] !== undefined && updates[field] !== null) {
      updated[field] = updates[field];
    }
  }

  // Track original ETD/ETA — only set once
  if (updates.etd && !updated.originalETD) updated.originalETD = updates.etd;
  if (updates.eta && !updated.originalETA) updated.originalETA = updates.eta;

  // Merge milestones — smart dedup by type AND fuzzy label
  if (updates.milestones && updates.milestones.length > 0) {
    const existing = (updated.milestones || []).map(m => ({ ...m }));

    // Normalize label for fuzzy matching
    const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    for (const incoming of updates.milestones) {
      const incomingNorm = norm(incoming.label);
      const incomingType = incoming.type;

      // Find an existing milestone that matches by type OR by normalized label
      const matchIdx = existing.findIndex(m =>
        (incomingType && m.type === incomingType) ||
        (incomingNorm && norm(m.label) === incomingNorm)
      );

      if (matchIdx >= 0) {
        // Update the existing milestone with the date from the booking
        // but preserve done/completed state
        existing[matchIdx] = {
          ...existing[matchIdx],
          date:     incoming.date     || existing[matchIdx].date,
          dateTime: incoming.dateTime || existing[matchIdx].dateTime,
          type:     incoming.type     || existing[matchIdx].type,
          source:   incoming.source,
        };
      } else {
        // Genuinely new milestone — add it
        existing.push(incoming);
      }
    }

    // Sort by date (TBD milestones go to top)
    updated.milestones = existing.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return -1;
      if (!b.date) return 1;
      return a.date.localeCompare(b.date);
    });
  }

  // Store parsed booking data
  if (updates._parsedBooking) updated.parsedBooking = updates._parsedBooking;

  // Advance status Planned → Booked
  if ((updated.status === 'Planned' || updated.status === 'planned') && updates.bookingNumber) {
    updated.status = 'booked';
  }

  updated.updatedAt = new Date().toISOString();
  return updated;
}

// ─── ETA change detection ───────────────────────────────────────────────────

export function checkETAChange(shipment) {
  if (!shipment.originalETA || !shipment.eta) return null;
  if (shipment.originalETA === shipment.eta) return null;

  const orig = new Date(shipment.originalETA);
  const curr = new Date(shipment.eta);
  const diffDays = Math.round((curr - orig) / (1000 * 60 * 60 * 24));

  if (Math.abs(diffDays) >= 7) {
    return {
      type: 'eta_change_alert',
      severity: Math.abs(diffDays) >= 14 ? 'high' : 'medium',
      originalETA: shipment.originalETA,
      currentETA: shipment.eta,
      diffDays,
      message: `ETA changed by ${diffDays > 0 ? '+' : ''}${diffDays} days (was ${shipment.originalETA})`,
    };
  }
  return null;
}
