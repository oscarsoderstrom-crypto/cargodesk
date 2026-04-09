import { useState, useEffect } from "react";
import { FileText, Upload, X, CheckCircle2, AlertTriangle, Link2, Trash2, ChevronDown, ChevronRight, Loader, Mail } from "lucide-react";
import { extractTextFromPDF, fileToBase64 } from "../parsers/pdfParser.js";
import { parseDocumentText, matchBookingToQuote, getDocTypeLabel, getDocTypeColor } from "../parsers/carrierParsers.js";
import { processPdfText, applyBookingToShipment } from "../parsers/documentIntelligence.js";
import { processDroppedFile } from "../parsers/documentIntelligence.js";
import { parseHapagQuotePdf, getChargesForSize } from "../parsers/quoteDocParsers.js";
import { addDocument, getDocuments, deleteDocument, getAllDocuments, updateShipment, getShipment, getDB } from "../db/schema.js";

export default function DocumentsTab({ T, shipment, onDocumentAdded }) {
  const [isDrag, setIsDrag] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { loadDocuments(); }, [shipment.id]);

  const loadDocuments = async () => {
    try { setDocuments(await getDocuments(shipment.id)); } catch (err) { console.error("Failed to load documents:", err); }
  };

  const handleDrop = async (e) => {
    e.preventDefault(); setIsDrag(false); setError(null);
    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf") || f.name.toLowerCase().endsWith(".msg")
    );
    if (!files.length) { setError("Please drop PDF or .msg files."); return; }
    for (const file of files) { await processFile(file); }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files); setError(null);
    for (const file of files) { await processFile(file); }
    e.target.value = "";
  };

  const processFile = async (file) => {
    setProcessing(true); setParseResult(null);
    try {
      if (file.name.toLowerCase().endsWith(".msg")) { await processMsgFile(file); return; }

      // ===== PDF HANDLING =====
      const extracted = await extractTextFromPDF(file);
      const parsed = parseDocumentText(extracted.text, file.name);
      const base64 = await fileToBase64(file);

      // Check booking-to-quote match
      let matchedQuote = null;
      if (parsed.documentType === "booking" && parsed.quoteReference) {
        const allDocs = await getAllDocuments();
        matchedQuote = matchBookingToQuote(parsed, allDocs);
      }

      // Save document
      const doc = {
        id: crypto.randomUUID(), shipmentId: shipment.id, name: file.name,
        type: parsed.documentType, date: new Date().toISOString().split("T")[0],
        size: file.size, base64Data: base64, parsedData: parsed,
        quoteNumber: parsed.quoteNumber || null, bookingNumber: parsed.bookingNumber || null,
        matchedQuoteId: matchedQuote?.id || null, rawText: extracted.text.slice(0, 5000),
      };
      await addDocument(doc);

      const currentShipment = await getShipment(shipment.id);

      // ===== CARRIER QUOTE PDF PARSER (Hapag-Lloyd structured quotes) =====
      const carrierQuote = parseHapagQuotePdf(extracted.text);
      if (carrierQuote && currentShipment) {
        const containerHint = currentShipment.containerTypeId || '40HC';
        const charges = getChargesForSize(carrierQuote, containerHint);
        if (charges.length > 0) {
          const existingCosts = currentShipment.costs || { quoted: 0, items: [], running: [] };
          const newItems = [...existingCosts.items];
          for (const c of charges) {
            const total = c.perUnit === 'per_container' ? c.amount * (currentShipment.containerCount || 1) : c.amount;
            if (!newItems.some(item => Math.abs(item.amount - total) < 0.01 && item.currency === c.currency && item.desc === c.description)) {
              newItems.push({
                id: crypto.randomUUID(), side: 'cost', category: c.category,
                desc: c.description, amount: total, currency: c.currency,
                source: 'carrier_quote', perUnit: c.perUnit,
              });
            }
          }
          await updateShipment(shipment.id, { costs: { ...existingCosts, items: newItems }, quotationNumber: carrierQuote.quoteNumber });
          setParseResult({
            type: "quote", parsed, matchedQuote: null,
            message: `${carrierQuote.carrier} quote #${carrierQuote.quoteNumber} — ${charges.length} charge lines extracted for ${containerHint}. Applied to costs.`,
          });
          await loadDocuments();
          if (onDocumentAdded) onDocumentAdded();
          setProcessing(false);
          return;
        }
      }

      // ===== ENHANCED BOOKING PARSER =====
      let bookingApplied = false;
      if (currentShipment) {
        const analysis = processPdfText(extracted.text, currentShipment);
        if (analysis.isBookingConfirmation && analysis.shipmentUpdates) {
          const updated = applyBookingToShipment(currentShipment, analysis.shipmentUpdates);
          const { _parsedBooking, ...saveData } = updated;
          await updateShipment(shipment.id, { ...saveData, parsedBooking: analysis.bookingData, updatedAt: new Date().toISOString() });
          bookingApplied = true;
          const su = analysis.shipmentUpdates;
          const fields = [];
          if (su.carrier) fields.push("carrier");
          if (su.vessel) fields.push("vessel");
          if (su.routing) fields.push("routing");
          if (su.etd) fields.push("ETD");
          if (su.eta) fields.push("ETA");
          if (su.carrierBookingNumber) fields.push("carrier booking #");
          if (su.blNumber) fields.push("BL number");
          if (su.quotationNumber) fields.push("quotation #");
          if (su.containerCount) fields.push("containers");
          if (su.customerRef) fields.push("customer ref");
          const newMs = su.milestones || [];
          if (newMs.length > 0) fields.push(`${newMs.length} deadlines`);
          setParseResult({
            type: "booking", parsed, matchedQuote,
            message: `${analysis.bookingData.carrier} booking confirmation parsed. Auto-populated: ${fields.join(", ")}.`,
          });
        } else {
          // ===== FALLBACK: Original carrierParsers =====
          const updates = {};
          if (parsed.carrierLabel && parsed.carrier && (!currentShipment.carrier || currentShipment.carrier === "")) updates.carrier = parsed.carrierLabel;
          if (parsed.vessel && (!currentShipment.vessel || currentShipment.vessel === "TBD" || currentShipment.vessel === "—")) updates.vessel = parsed.vessel;
          if (parsed.voyage && (!currentShipment.voyage || currentShipment.voyage === "TBD" || currentShipment.voyage === "—")) updates.voyage = parsed.voyage;
          if (parsed.origin && (!currentShipment.origin || currentShipment.origin === "")) updates.origin = parsed.origin;
          if (parsed.destination && (!currentShipment.destination || currentShipment.destination === "")) updates.destination = parsed.destination;
          if (parsed.ports && parsed.ports.length >= 2) {
            const routing = parsed.ports.join(" → ");
            if (!currentShipment.routing || currentShipment.routing === "" || currentShipment.routing === `${currentShipment.origin} → ${currentShipment.destination}`) updates.routing = routing;
          }
          if (parsed.containers && parsed.containers.length > 0 && (!currentShipment.containerType || currentShipment.containerType === "")) updates.containerType = parsed.containers.join(", ");
          if (parsed.documentType === "booking" && parsed.bookingNumber && (!currentShipment.ref || currentShipment.ref === "" || currentShipment.refPending)) {
            updates.ref = parsed.bookingNumber; updates.refPending = false;
          }
          if (parsed.documentType === "quote" && parsed.amounts && parsed.amounts.length > 0) {
            const existingCosts = currentShipment.costs || { quoted: 0, items: [], running: [] };
            const newItems = [...existingCosts.items];
            for (const amount of parsed.amounts) {
              if (!newItems.some(item => Math.abs(item.amount - amount.amount) < 0.01 && item.currency === amount.currency)) {
                newItems.push({ id: crypto.randomUUID(), side: 'cost', category: "transport", desc: amount.desc || amount.description || `${parsed.carrierLabel || "Carrier"} charge`, amount: amount.amount, currency: amount.currency });
              }
            }
            let newQuoted = existingCosts.quoted;
            if (newQuoted === 0 && parsed.amounts.length > 0) newQuoted = parsed.amounts.reduce((max, a) => a.amount > max.amount ? a : max, parsed.amounts[0]).amount;
            updates.costs = { ...existingCosts, items: newItems, quoted: newQuoted };
          }
          if (parsed.documentType === "booking" && currentShipment.status === "planned") updates.status = "booked";
          if (Object.keys(updates).length > 0) await updateShipment(shipment.id, updates);

          if (!bookingApplied) {
            const updatedFields = [];
            if (parsed.carrierLabel && parsed.carrier) updatedFields.push("carrier");
            if (parsed.vessel) updatedFields.push("vessel");
            if (parsed.bookingNumber && parsed.documentType === "booking") updatedFields.push("reference");
            if (parsed.amounts?.length > 0 && parsed.documentType === "quote") updatedFields.push(`${parsed.amounts.length} cost(s)`);
            if (parsed.ports?.length >= 2) updatedFields.push("routing");
            if (parsed.containers?.length > 0) updatedFields.push("containers");
            const autoMsg = updatedFields.length > 0 ? ` Auto-populated: ${updatedFields.join(", ")}.` : "";
            setParseResult({
              type: parsed.documentType, parsed, matchedQuote: null,
              message: parsed.documentType === "quote"
                ? `${parsed.carrierLabel || "Unknown"} quote${parsed.quoteNumber ? ` #${parsed.quoteNumber}` : ""} stored.${autoMsg}`
                : parsed.documentType === "booking"
                ? (matchedQuote ? `Booking linked to quote ${matchedQuote.parsedData?.quoteNumber || matchedQuote.name}.${autoMsg}` : `Booking confirmation${parsed.bookingNumber ? ` #${parsed.bookingNumber}` : ""} stored.${autoMsg}`)
                : `${getDocTypeLabel(parsed.documentType)} from ${parsed.carrierLabel || "unknown carrier"} stored.${autoMsg}`,
            });
          }
        }
      }
      await loadDocuments();
      if (onDocumentAdded) onDocumentAdded();
    } catch (err) {
      console.error("Failed to process file:", err);
      setError(`Failed to process ${file.name}: ${err.message}`);
    } finally { setProcessing(false); }
  };

  const processMsgFile = async (file) => {
    try {
      const result = await processDroppedFile(file, shipment);
      if (result.error) { setError(result.error); setProcessing(false); return; }
      const docRecord = {
        id: 'doc_' + Date.now(), shipmentId: shipment.id, name: file.name,
        type: result.quote ? 'quote' : 'email',
        date: new Date().toISOString().slice(0, 10),
        rawText: result.bodyText?.slice(0, 5000) || '',
        parsedData: result.quote ? {
          quoteOrigin: result.quote.origin, quoteDestination: result.quote.destination,
          costs: result.quote.costs,
          amounts: result.quote.costs.map(c => ({ amount: c.amount, currency: c.currency, desc: c.description })),
          carrier: result.quote.carrier, carrierLabel: result.quote.carrier,
        } : null,
      };
      await addDocument(docRecord);
      if (result.quote) {
        result.quote.shipmentId = shipment.id;
        const db = getDB();
        await db.quotes.add(result.quote);
        // Apply costs from quote to shipment
        const cs = await getShipment(shipment.id);
        if (cs && result.quote.costs && result.quote.costs.length > 0) {
          const existingCosts = cs.costs || { quoted: 0, items: [], running: [] };
          const newItems = [...existingCosts.items];
          for (const c of result.quote.costs) {
            const total = c.perUnit === 'per_container' ? c.amount * (cs.containerCount || 1) : c.amount;
            newItems.push({
              id: 'ci_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
              side: 'revenue', category: c.category || 'transport',
              desc: c.description, amount: total, currency: c.currency,
              source: 'quote', quoteId: result.quote.id,
            });
          }
          let quoted = existingCosts.quoted;
          if (quoted === 0) quoted = (result.quote.totalEUR || 0) + (result.quote.totalUSD || 0);
          await updateShipment(shipment.id, { costs: { ...existingCosts, items: newItems, quoted } });
        }
      }
      for (const pdfA of (result.pdfAttachments || [])) {
        await addDocument({
          id: 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
          shipmentId: shipment.id, name: pdfA.filename, type: 'attachment',
          date: new Date().toISOString().slice(0, 10), base64Data: pdfA.base64,
        });
      }
      setParseResult({
        type: result.quote ? 'quote' : 'email', parsed: null, matchedQuote: null,
        message: `Email "${result.subject || file.name}" processed.${result.quote ? ' Quote detected — costs applied.' : ''}${result.pdfAttachments?.length ? ` ${result.pdfAttachments.length} PDF attachment(s) extracted.` : ''}`,
      });
      await loadDocuments();
      if (onDocumentAdded) onDocumentAdded();
    } catch (err) {
      console.error("Failed to process .msg:", err);
      setError(`Failed to process ${file.name}: ${err.message}`);
    } finally { setProcessing(false); }
  };

  const handleDelete = async (docId) => { await deleteDocument(docId); await loadDocuments(); if (onDocumentAdded) onDocumentAdded(); };

  const fmtSize = (bytes) => { if (!bytes) return ""; if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`; return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; };
  const fmtDate = (d) => { if (!d) return "—"; return new Date(d).toLocaleDateString("fi-FI", { day: "numeric", month: "short", year: "numeric" }); };

  return (
    <div>
      {/* Drop zone */}
      <div onDragOver={e => { e.preventDefault(); setIsDrag(true); }} onDragLeave={() => setIsDrag(false)} onDrop={handleDrop}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, borderRadius: 12, marginBottom: 24, cursor: "pointer",
          border: `2px dashed ${isDrag ? T.accent : T.border2}`, background: isDrag ? T.accentGlow : T.bg2, transition: "all 0.2s" }}
        onClick={() => document.getElementById("file-input-docs")?.click()}>
        {processing ? (
          <><Loader size={32} color={T.accent} style={{ marginBottom: 12, animation: "spin 1s linear infinite" }} />
            <div style={{ fontSize: 14, fontWeight: 500, color: T.accent }}>Processing file...</div>
            <style>{`@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}`}</style></>
        ) : (
          <><Upload size={32} color={isDrag ? T.accent : T.text3} style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 500, color: isDrag ? T.accent : T.text2 }}>Drop PDF or .msg files here or click to browse</div>
            <div style={{ fontSize: 12, marginTop: 4, color: T.text3 }}>Quotes, bookings, BLs, invoices, email quotes — auto-parsed</div></>
        )}
        <input id="file-input-docs" type="file" accept=".pdf,.msg" multiple onChange={handleFileSelect} style={{ display: "none" }} />
      </div>

      {/* Parse result */}
      {parseResult && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 16, borderRadius: 10, marginBottom: 16,
          border: `1px solid ${parseResult.matchedQuote ? T.greenBorder : T.border1}`,
          background: parseResult.matchedQuote ? T.greenBg : T.bg3 }}>
          {parseResult.type === 'email' ? <Mail size={18} color={T.accent} style={{ flexShrink: 0, marginTop: 2 }} />
            : parseResult.matchedQuote ? <Link2 size={18} color={T.green} style={{ flexShrink: 0, marginTop: 2 }} />
            : <CheckCircle2 size={18} color={T.accent} style={{ flexShrink: 0, marginTop: 2 }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: T.text0 }}>{parseResult.message}</div>
            {parseResult.parsed && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {parseResult.parsed.carrier && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: T.bg4, color: T.text1 }}>{parseResult.parsed.carrierLabel}</span>}
                {parseResult.parsed.ports?.length > 0 && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: T.bg4, color: T.text1 }}>{parseResult.parsed.ports.join(" → ")}</span>}
                {parseResult.parsed.containers?.length > 0 && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: T.bg4, color: T.text1 }}>{parseResult.parsed.containers.join(", ")}</span>}
                {parseResult.parsed.amounts?.length > 0 && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: T.amberBg, color: T.amber }}>
                  {parseResult.parsed.amounts.map(a => `${a.currency} ${a.amount.toLocaleString("fi-FI")}`).join(", ")}</span>}
              </div>
            )}
          </div>
          <button onClick={() => setParseResult(null)} style={{ background: "none", border: "none", cursor: "pointer", color: T.text3, padding: 4 }}><X size={14} /></button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, borderRadius: 10, marginBottom: 16, border: `1px solid ${T.redBorder}`, background: T.redBg }}>
          <AlertTriangle size={18} color={T.red} /><div style={{ flex: 1, fontSize: 14, color: T.red }}>{error}</div>
          <button onClick={() => setError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: T.text3, padding: 4 }}><X size={14} /></button>
        </div>
      )}

      {/* Document list */}
      <div style={{ borderRadius: 10, border: `1px solid ${T.border1}`, overflow: "hidden" }}>
        {documents.map((doc, i) => {
          const typeCol = getDocTypeColor(doc.type, T);
          const isExpanded = expandedDoc === doc.id;
          const pd = doc.parsedData;
          return (
            <div key={doc.id} style={{ borderBottom: i < documents.length - 1 ? `1px solid ${T.border0}` : "none", background: T.bg2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer" }}
                onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}>
                {(doc.type === 'email' || (doc.type === 'quote' && doc.name.endsWith('.msg'))) ? <Mail size={18} color={typeCol.text} /> : <FileText size={18} color={typeCol.text} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: T.text0 }}>{doc.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                    <span style={{ fontSize: 12, color: T.text3 }}>{fmtDate(doc.date)}</span>
                    {doc.size && <span style={{ fontSize: 12, color: T.text3 }}>• {fmtSize(doc.size)}</span>}
                    {pd?.carrier && <span style={{ fontSize: 12, color: T.text2 }}>• {pd.carrierLabel}</span>}
                  </div>
                </div>
                {doc.matchedQuoteId && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, padding: "2px 8px", borderRadius: 4, background: T.greenBg, color: T.green, border: `1px solid ${T.greenBorder}` }}><Link2 size={11} /> Linked</span>}
                <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: typeCol.bg, color: typeCol.text }}>{getDocTypeLabel(doc.type)}</span>
                {isExpanded ? <ChevronDown size={16} color={T.text3} /> : <ChevronRight size={16} color={T.text3} />}
              </div>
              {isExpanded && (
                <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${T.border0}` }}>
                  {pd && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "12px 0" }}>
                      {pd.quoteNumber && <div><span style={{ fontSize: 11, color: T.text3, textTransform: "uppercase" }}>Quote #</span><div style={{ fontSize: 13, fontWeight: 600, color: T.text0, fontFamily: "'JetBrains Mono',monospace" }}>{pd.quoteNumber}</div></div>}
                      {pd.bookingNumber && <div><span style={{ fontSize: 11, color: T.text3, textTransform: "uppercase" }}>Booking #</span><div style={{ fontSize: 13, fontWeight: 600, color: T.text0, fontFamily: "'JetBrains Mono',monospace" }}>{pd.bookingNumber}</div></div>}
                      {pd.vessel && <div><span style={{ fontSize: 11, color: T.text3, textTransform: "uppercase" }}>Vessel</span><div style={{ fontSize: 13, color: T.text0 }}>{pd.vessel}{pd.voyage ? ` / ${pd.voyage}` : ""}</div></div>}
                      {pd.ports?.length > 0 && <div><span style={{ fontSize: 11, color: T.text3, textTransform: "uppercase" }}>Routing</span><div style={{ fontSize: 13, color: T.text0 }}>{pd.ports.join(" → ")}</div></div>}
                      {pd.containers?.length > 0 && <div><span style={{ fontSize: 11, color: T.text3, textTransform: "uppercase" }}>Containers</span><div style={{ fontSize: 13, color: T.text0 }}>{pd.containers.join(", ")}</div></div>}
                      {pd.quoteReference && <div><span style={{ fontSize: 11, color: T.text3, textTransform: "uppercase" }}>References Quote</span><div style={{ fontSize: 13, fontWeight: 600, color: T.amber, fontFamily: "'JetBrains Mono',monospace" }}>{pd.quoteReference}</div></div>}
                      {pd.quoteOrigin && <div><span style={{ fontSize: 11, color: T.text3, textTransform: "uppercase" }}>Route</span><div style={{ fontSize: 13, color: T.text0 }}>{pd.quoteOrigin} → {pd.quoteDestination}</div></div>}
                    </div>
                  )}
                  {pd?.amounts?.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <span style={{ fontSize: 11, color: T.text3, textTransform: "uppercase" }}>Amounts Found</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                        {pd.amounts.map((a, j) => <span key={j} style={{ fontSize: 12, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: T.amberBg, color: T.amber, fontFamily: "'JetBrains Mono',monospace" }}>{a.currency} {a.amount.toLocaleString("fi-FI")}{a.desc ? ` — ${a.desc}` : ''}</span>)}
                      </div>
                    </div>
                  )}
                  {doc.rawText && !pd && (
                    <div style={{ padding: "12px 0", fontSize: 12, color: T.text3, maxHeight: 120, overflow: "auto", whiteSpace: "pre-wrap" }}>
                      {doc.rawText.slice(0, 500)}...
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                    {pd?.confidence !== undefined ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: T.text3 }}>Confidence:</span>
                        <div style={{ width: 60, height: 4, borderRadius: 2, background: T.bg4 }}>
                          <div style={{ height: "100%", width: `${(pd.confidence || 0) * 100}%`, borderRadius: 2, background: pd.confidence > 0.7 ? T.green : pd.confidence > 0.4 ? T.amber : T.red }} />
                        </div>
                        <span style={{ fontSize: 11, color: T.text3 }}>{Math.round((pd.confidence || 0) * 100)}%</span>
                      </div>
                    ) : <div />}
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                      style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: "4px 8px", borderRadius: 4, background: "none", border: `1px solid ${T.redBorder}`, color: T.red, cursor: "pointer" }}>
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!documents.length && <div style={{ padding: 32, textAlign: "center", fontSize: 14, color: T.text3, background: T.bg2 }}>No documents yet — drop PDFs or .msg files above to start</div>}
      </div>
    </div>
  );
}
