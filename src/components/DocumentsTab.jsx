import { useState, useEffect, useContext, createContext } from "react";
import { FileText, Upload, X, CheckCircle2, AlertTriangle, Link2, Trash2, ChevronDown, ChevronRight, Loader } from "lucide-react";
import { extractTextFromPDF, fileToBase64 } from "../parsers/pdfParser.js";
import { parseDocumentText, matchBookingToQuote, getDocTypeLabel, getDocTypeColor } from "../parsers/carrierParsers.js";
import { addDocument, getDocuments, deleteDocument, getAllDocuments } from "../db/schema.js";

/**
 * Documents tab for a shipment.
 * Handles PDF drag-and-drop, parsing, quote-booking matching, and display.
 */
export default function DocumentsTab({ T, shipment, onDocumentAdded }) {
  const [isDrag, setIsDrag] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [error, setError] = useState(null);

  // Load documents for this shipment
  useEffect(() => {
    loadDocuments();
  }, [shipment.id]);

  const loadDocuments = async () => {
    try {
      const docs = await getDocuments(shipment.id);
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDrag(false);
    setError(null);

    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (!files.length) {
      setError('Please drop PDF files only.');
      return;
    }

    for (const file of files) {
      await processFile(file);
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    setError(null);
    for (const file of files) {
      await processFile(file);
    }
    e.target.value = '';
  };

  const processFile = async (file) => {
    setProcessing(true);
    setParseResult(null);

    try {
      // 1. Extract text from PDF
      const extracted = await extractTextFromPDF(file);

      // 2. Parse the text for structured data
      const parsed = parseDocumentText(extracted.text, file.name);

      // 3. Convert file to base64 for storage
      const base64 = await fileToBase64(file);

      // 4. Check if booking references a known quote
      let matchedQuote = null;
      if (parsed.documentType === 'booking' && parsed.quoteReference) {
        const allDocs = await getAllDocuments();
        matchedQuote = matchBookingToQuote(parsed, allDocs);
      }

      // 5. Build document record
      const doc = {
        id: crypto.randomUUID(),
        shipmentId: shipment.id,
        name: file.name,
        type: parsed.documentType,
        date: new Date().toISOString().split('T')[0],
        size: file.size,
        base64Data: base64,
        parsedData: parsed,
        quoteNumber: parsed.quoteNumber || null,
        bookingNumber: parsed.bookingNumber || null,
        matchedQuoteId: matchedQuote?.id || null,
        rawText: extracted.text.slice(0, 5000), // Store first 5000 chars for search
      };

      // 6. Save to IndexedDB
      await addDocument(doc);

      // 7. Auto-populate shipment fields if this is a quote with cost data
      if (parsed.documentType === 'quote' && parsed.amounts.length > 0) {
        setParseResult({
          type: 'quote',
          parsed,
          matchedQuote: null,
          message: `Found ${parsed.carrierLabel} quote${parsed.quoteNumber ? ` #${parsed.quoteNumber}` : ''} with ${parsed.amounts.length} cost item(s).`,
        });
      } else if (parsed.documentType === 'booking') {
        setParseResult({
          type: 'booking',
          parsed,
          matchedQuote,
          message: matchedQuote
            ? `Booking linked to quote ${matchedQuote.parsedData?.quoteNumber || matchedQuote.name}.`
            : `Booking confirmation${parsed.bookingNumber ? ` #${parsed.bookingNumber}` : ''} stored.${parsed.quoteReference ? ` Quote ref "${parsed.quoteReference}" not found in existing documents.` : ''}`,
        });
      } else {
        setParseResult({
          type: parsed.documentType,
          parsed,
          matchedQuote: null,
          message: `${getDocTypeLabel(parsed.documentType)} from ${parsed.carrierLabel || 'unknown carrier'} stored.`,
        });
      }

      await loadDocuments();
      if (onDocumentAdded) onDocumentAdded();

    } catch (err) {
      console.error('Failed to process PDF:', err);
      setError(`Failed to process ${file.name}: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (docId) => {
    if (confirm('Delete this document?')) {
      await deleteDocument(docId);
      await loadDocuments();
    }
  };

  const fmtSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const fmtDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fi-FI', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDrag(true); }}
        onDragLeave={() => setIsDrag(false)}
        onDrop={handleDrop}
        style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: 32, borderRadius: 12, marginBottom: 24, cursor: "pointer",
          border: `2px dashed ${isDrag ? T.accent : T.border2}`,
          background: isDrag ? T.accentGlow : T.bg2,
          transition: "all 0.2s",
        }}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        {processing ? (
          <>
            <Loader size={32} color={T.accent} style={{ marginBottom: 12, animation: "spin 1s linear infinite" }} />
            <div style={{ fontSize: 14, fontWeight: 500, color: T.accent }}>Processing PDF...</div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </>
        ) : (
          <>
            <Upload size={32} color={isDrag ? T.accent : T.text3} style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 500, color: isDrag ? T.accent : T.text2 }}>
              Drop PDF files here or click to browse
            </div>
            <div style={{ fontSize: 12, marginTop: 4, color: T.text3 }}>
              Quotes, bookings, BLs, invoices — auto-parsed and matched
            </div>
          </>
        )}
        <input id="file-input" type="file" accept=".pdf" multiple onChange={handleFileSelect}
          style={{ display: "none" }} />
      </div>

      {/* Parse result notification */}
      {parseResult && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 12, padding: 16, borderRadius: 10,
          marginBottom: 16, border: `1px solid ${parseResult.matchedQuote ? T.greenBorder : T.border1}`,
          background: parseResult.matchedQuote ? T.greenBg : T.bg3,
        }}>
          {parseResult.matchedQuote ? (
            <Link2 size={18} color={T.green} style={{ flexShrink: 0, marginTop: 2 }} />
          ) : (
            <CheckCircle2 size={18} color={T.accent} style={{ flexShrink: 0, marginTop: 2 }} />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: T.text0 }}>{parseResult.message}</div>
            {parseResult.parsed && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {parseResult.parsed.carrier && (
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: T.bg4, color: T.text1 }}>
                    {parseResult.parsed.carrierLabel}
                  </span>
                )}
                {parseResult.parsed.ports.length > 0 && (
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: T.bg4, color: T.text1 }}>
                    {parseResult.parsed.ports.join(' → ')}
                  </span>
                )}
                {parseResult.parsed.containers.length > 0 && (
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: T.bg4, color: T.text1 }}>
                    {parseResult.parsed.containers.join(', ')}
                  </span>
                )}
                {parseResult.parsed.amounts.length > 0 && (
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: T.amberBg, color: T.amber }}>
                    {parseResult.parsed.amounts.map(a => `${a.currency} ${a.amount.toLocaleString('fi-FI')}`).join(', ')}
                  </span>
                )}
              </div>
            )}
          </div>
          <button onClick={() => setParseResult(null)} style={{ background: "none", border: "none", cursor: "pointer", color: T.text3, padding: 4 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Error notification */}
      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: 16, borderRadius: 10,
          marginBottom: 16, border: `1px solid ${T.redBorder}`, background: T.redBg,
        }}>
          <AlertTriangle size={18} color={T.red} />
          <div style={{ flex: 1, fontSize: 14, color: T.red }}>{error}</div>
          <button onClick={() => setError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: T.text3, padding: 4 }}>
            <X size={14} />
          </button>
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
              {/* Main row */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer" }}
                onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}>
                <FileText size={18} color={typeCol.text} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: T.text0 }}>{doc.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                    <span style={{ fontSize: 12, color: T.text3 }}>{fmtDate(doc.date)}</span>
                    {doc.size && <span style={{ fontSize: 12, color: T.text3 }}>• {fmtSize(doc.size)}</span>}
                    {pd?.carrier && <span style={{ fontSize: 12, color: T.text2 }}>• {pd.carrierLabel}</span>}
                  </div>
                </div>
                {doc.matchedQuoteId && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, padding: "2px 8px", borderRadius: 4, background: T.greenBg, color: T.green, border: `1px solid ${T.greenBorder}` }}>
                    <Link2 size={11} /> Linked
                  </span>
                )}
                <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: typeCol.bg, color: typeCol.text }}>
                  {getDocTypeLabel(doc.type)}
                </span>
                {isExpanded ? <ChevronDown size={16} color={T.text3} /> : <ChevronRight size={16} color={T.text3} />}
              </div>

              {/* Expanded details */}
              {isExpanded && pd && (
                <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${T.border0}` }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "12px 0" }}>
                    {pd.quoteNumber && (
                      <div><span style={{ fontSize: 11, color: T.text3, textTransform: "uppercase" }}>Quote #</span>
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.text0, fontFamily: "'JetBrains Mono',monospace" }}>{pd.quoteNumber}</div></div>
                    )}
                    {pd.bookingNumber && (
                      <div><span style={{ fontSize: 11, color: T.text3, textTransform: "uppercase" }}>Booking #</span>
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.text0, fontFamily: "'JetBrains Mono',monospace" }}>{pd.bookingNumber}</div></div>
                    )}
                    {pd.vessel && (
                      <div><span style={{ fontSize: 11, color: T.text3, textTransform: "uppercase" }}>Vessel</span>
                        <div style={{ fontSize: 13, color: T.text0 }}>{pd.vessel}{pd.voyage ? ` / ${pd.voyage}` : ''}</div></div>
                    )}
                    {pd.ports.length > 0 && (
                      <div><span style={{ fontSize: 11, color: T.text3, textTransform: "uppercase" }}>Routing</span>
                        <div style={{ fontSize: 13, color: T.text0 }}>{pd.ports.join(' → ')}</div></div>
                    )}
                    {pd.containers.length > 0 && (
                      <div><span style={{ fontSize: 11, color: T.text3, textTransform: "uppercase" }}>Containers</span>
                        <div style={{ fontSize: 13, color: T.text0 }}>{pd.containers.join(', ')}</div></div>
                    )}
                    {pd.quoteReference && (
                      <div><span style={{ fontSize: 11, color: T.text3, textTransform: "uppercase" }}>References Quote</span>
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.amber, fontFamily: "'JetBrains Mono',monospace" }}>{pd.quoteReference}</div></div>
                    )}
                  </div>

                  {/* Amounts found */}
                  {pd.amounts.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <span style={{ fontSize: 11, color: T.text3, textTransform: "uppercase" }}>Amounts Found</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                        {pd.amounts.map((a, j) => (
                          <span key={j} style={{ fontSize: 12, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: T.amberBg, color: T.amber, fontFamily: "'JetBrains Mono',monospace" }}>
                            {a.currency} {a.amount.toLocaleString('fi-FI')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Confidence */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: T.text3 }}>Parse confidence:</span>
                      <div style={{ width: 60, height: 4, borderRadius: 2, background: T.bg4 }}>
                        <div style={{ height: "100%", width: `${(pd.confidence || 0) * 100}%`, borderRadius: 2, background: pd.confidence > 0.7 ? T.green : pd.confidence > 0.4 ? T.amber : T.red }} />
                      </div>
                      <span style={{ fontSize: 11, color: T.text3 }}>{Math.round((pd.confidence || 0) * 100)}%</span>
                    </div>
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

        {!documents.length && (
          <div style={{ padding: 32, textAlign: "center", fontSize: 14, color: T.text3, background: T.bg2 }}>
            No documents yet — drop PDFs above to start
          </div>
        )}
      </div>
    </div>
  );
}
