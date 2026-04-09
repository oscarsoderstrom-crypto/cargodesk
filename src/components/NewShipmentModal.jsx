// NewShipmentModal.jsx — v4
// Adds document drop zone at top: drop a booking PDF or quote .msg to auto-populate the form.
// Wires into: extractTextFromPDF (pdfParser.js), processPdfText + getFileType (documentIntelligence.js),
//             processMsgFile (msgParser.js), parseQuoteSubject (quoteParsers.js),
//             bookingToShipmentUpdates (bookingParsers.js)

import { useState, useEffect, useMemo, useCallback } from "react";
import { X, Ship, Plane, Truck, Plus, Leaf, Bookmark, FileText, Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import PortSelect from "./PortSelect.jsx";
import ContainerSelect from "./ContainerSelect.jsx";
import CarrierSelect from "./CarrierSelect.jsx";
import { findPort, routeDistanceKm } from "../utils/ports.js";
import { formatContainer, getContainerType } from "../utils/containers.js";
import { calculateCO2e, formatCO2e } from "../utils/co2Calculator.js";
import { extractTextFromPDF } from "../parsers/pdfParser.js";
import { processPdfText, getFileType } from "../parsers/documentIntelligence.js";
import { processMsgFile } from "../parsers/msgParser.js";
import { parseQuoteSubject } from "../parsers/quoteParsers.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const CONTAINER_FROM_TYPE = {
  '40HC': '40HC',
  '40GP': '40DV',
  '20GP': '20DV',
  '45GP': '45HC',
};

function containerTypeIdFromBooking(typeStr) {
  if (!typeStr) return null;
  const s = typeStr.toUpperCase();
  if (s.includes('45')) return '45HC';
  if (s.includes('40') && (s.includes('HC') || s.includes('HIGH'))) return '40HC';
  if (s.includes('40')) return '40DV';
  if (s.includes('20')) return '20DV';
  return null;
}

// ─── Populated-fields banner ──────────────────────────────────────────────────

const FIELD_LABELS = {
  origin: 'Origin', destination: 'Destination', carrier: 'Carrier',
  etd: 'ETD', eta: 'ETA', vessel: 'Vessel', voyage: 'Voyage',
  routing: 'Routing', containerType: 'Container type', containerCount: 'Container count',
  customerRef: 'Customer ref', blNumber: 'BL / SWB', quotationNumber: 'Quotation no.',
};

function ParseBanner({ populated, docName, T, onDismiss }) {
  if (!populated || populated.length === 0) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 14px', borderRadius: 8,
      background: T.greenBg, border: `1px solid ${T.greenBorder}`,
      marginBottom: 16,
    }}>
      <CheckCircle2 size={16} color={T.green} style={{ marginTop: 2, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.green, marginBottom: 3 }}>
          Populated from <span style={{ fontStyle: 'italic' }}>{docName}</span>
        </div>
        <div style={{ fontSize: 12, color: T.green, opacity: 0.85 }}>
          {populated.map(f => FIELD_LABELS[f] || f).join(' · ')}
        </div>
      </div>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: T.green, cursor: 'pointer', padding: 0, opacity: 0.7 }}>
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Drop zone ────────────────────────────────────────────────────────────────

function DocDropZone({ T, onFileDrop, parsing, error }) {
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const valid = files.find(f => {
      const name = f.name.toLowerCase();
      return name.endsWith('.pdf') || name.endsWith('.msg');
    });
    if (valid) onFileDrop(valid);
  }

  function handleInputChange(e) {
    const file = e.target.files?.[0];
    if (file) onFileDrop(file);
    e.target.value = '';
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 6 }}>
        Auto-populate from document <span style={{ fontWeight: 400, color: T.text3 }}>(optional)</span>
      </label>
      <label
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '14px 20px', borderRadius: 8, cursor: 'pointer',
          background: dragOver ? T.accentGlow : T.bg3,
          border: `2px dashed ${dragOver ? T.accent : T.border2}`,
          transition: 'all 0.15s',
        }}
      >
        <input type="file" accept=".pdf,.msg" onChange={handleInputChange} style={{ display: 'none' }} />
        {parsing ? (
          <>
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${T.accent}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
            <span style={{ fontSize: 13, color: T.text2 }}>Parsing document…</span>
          </>
        ) : (
          <>
            <Upload size={16} color={T.text3} />
            <span style={{ fontSize: 13, color: T.text2 }}>
              Drop booking PDF or quote .msg here, or <span style={{ color: T.accent, textDecoration: 'underline' }}>browse</span>
            </span>
          </>
        )}
      </label>
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, color: T.amber }}>
          <AlertTriangle size={13} /> {error}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function NewShipmentModal({ T, projects, nextRef, onSave, onClose, templates = [], shipments = [] }) {
  const [form, setForm] = useState({
    ref: "", refManual: false, projectId: "", customerRef: "",
    mode: "ocean", status: "planned",
    origin: "", originPort: null, destination: "", destinationPort: null,
    vessel: "TBD", voyage: "TBD", carrier: "", routing: "",
    etd: "", eta: "", containerType: "40HC", containerCount: 1, quotedAmount: 0,
    // Phase C extras (not stored on shipment — used for quote linking)
    _parsedQuote: null,
    _blNumber: null,
    _quotationNumber: null,
  });

  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectCustomer, setNewProjectCustomer] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [co2, setCo2] = useState(null);

  // Doc drop state
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [parsedFrom, setParsedFrom] = useState(null);      // filename
  const [populatedFields, setPopulatedFields] = useState(null);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // Duplicate detection
  const duplicateWarning = useMemo(() => {
    if (!form.origin || !form.destination || !form.carrier) return null;
    const match = shipments.find(s =>
      s.origin?.toLowerCase() === form.origin.toLowerCase() &&
      s.destination?.toLowerCase() === form.destination.toLowerCase() &&
      s.carrier?.toLowerCase() === form.carrier.toLowerCase() &&
      s.status !== "completed" && s.status !== "delivered"
    );
    if (match) return `Similar active shipment exists: ${match.ref || "Pending ref"} (${match.customerRef || match.origin + " → " + match.destination})`;
    return null;
  }, [form.origin, form.destination, form.carrier, shipments]);

  // Apply template
  const applyTemplate = (templateId) => {
    const tmpl = templates.find(t => t.id === templateId);
    if (!tmpl) return;
    setForm(f => ({
      ...f,
      mode: tmpl.mode || f.mode,
      origin: tmpl.origin || f.origin,
      destination: tmpl.destination || f.destination,
      carrier: tmpl.carrier || f.carrier,
      containerType: tmpl.containerTypeId || f.containerType,
      containerCount: tmpl.containerCount || f.containerCount,
      routing: tmpl.routing || f.routing,
      projectId: tmpl.projectId || f.projectId,
    }));
  };

  // CO2 recalculation
  useEffect(() => {
    const oPort = form.originPort || findPort(form.origin?.split(",")[0]?.trim());
    const dPort = form.destinationPort || findPort(form.destination?.split(",")[0]?.trim());
    if (oPort && dPort) {
      const { distance } = routeDistanceKm([oPort.name, dPort.name]);
      const adj = form.mode === "ocean" ? distance * 1.15 : form.mode === "air" ? distance * 1.05 : distance * 1.3;
      const type = getContainerType(form.containerType);
      const co2Key = type?.label?.replace(/'/g, "'") || "40'HC";
      setCo2(calculateCO2e({ mode: form.mode, distanceKm: adj, containerType: co2Key, containerCount: form.containerCount }));
    } else { setCo2(null); }
  }, [form.origin, form.destination, form.originPort, form.destinationPort, form.mode, form.containerType, form.containerCount]);

  useEffect(() => {
    if (form.origin && form.destination) set("routing", `${form.origin} → ${form.destination}`);
  }, [form.origin, form.destination]);

  // ─── Document drop handler ────────────────────────────────────────────────

  const handleFileDrop = useCallback(async (file) => {
    setParsing(true);
    setParseError(null);
    setPopulatedFields(null);
    setParsedFrom(null);

    try {
      const fileType = getFileType(file);
      const populated = [];

      if (fileType === 'pdf') {
        // Extract text from PDF
        const rawText = await extractTextFromPDF(file);
        if (!rawText || rawText.length < 50) {
          setParseError('Could not read text from this PDF.');
          return;
        }

        const analysis = processPdfText(rawText, null);

        if (analysis.isBookingConfirmation && analysis.shipmentUpdates) {
          const u = analysis.shipmentUpdates;

          setForm(f => {
            const next = { ...f };

            if (u.origin && !f.origin) { next.origin = u.origin; populated.push('origin'); }
            if (u.destination && !f.destination) { next.destination = u.destination; populated.push('destination'); }
            if (u.carrier) { next.carrier = u.carrier; populated.push('carrier'); }
            if (u.etd) { next.etd = u.etd.slice(0, 10); populated.push('etd'); }
            if (u.eta) { next.eta = u.eta.slice(0, 10); populated.push('eta'); }
            if (u.vessel && u.vessel !== 'TBD') { next.vessel = u.vessel; populated.push('vessel'); }
            if (u.voyage && u.voyage !== 'TBD') { next.voyage = u.voyage; populated.push('voyage'); }
            if (u.routing) { next.routing = u.routing; populated.push('routing'); }
            if (u.customerRef && !f.customerRef) { next.customerRef = u.customerRef; populated.push('customerRef'); }
            if (u.blNumber) { next._blNumber = u.blNumber; populated.push('blNumber'); }
            if (u.quotationNumber) { next._quotationNumber = u.quotationNumber; populated.push('quotationNumber'); }

            if (u.containerCount && u.containerCount > 0) {
              next.containerCount = u.containerCount;
              populated.push('containerCount');
            }
            if (u.containerTypeId) {
              const ctId = containerTypeIdFromBooking(u.containerTypeId);
              if (ctId) { next.containerType = ctId; populated.push('containerType'); }
            }

            // Booking → set status to booked
            next.status = 'booked';

            return next;
          });

        } else if (analysis.isQuote && analysis.quoteData) {
          setForm(f => {
            const next = { ...f, _parsedQuote: analysis.quoteData };
            return next;
          });
          populated.push('quote');
          setParseError('Quote data detected — costs will be available after creating the shipment.');

        } else {
          setParseError('No booking confirmation or quote detected in this PDF.');
          return;
        }

      } else if (fileType === 'msg') {
        // Parse .msg email
        const msg = await processMsgFile(file);
        if (!msg) {
          setParseError('Could not parse this .msg file.');
          return;
        }

        const subjectData = parseQuoteSubject(msg.subject);
        if (subjectData) {
          setForm(f => {
            const next = { ...f };
            if (subjectData.origin && !f.origin) { next.origin = subjectData.origin; populated.push('origin'); }
            if (subjectData.destination && !f.destination) { next.destination = subjectData.destination; populated.push('destination'); }
            if (subjectData.containerType) { next.containerType = subjectData.containerType; populated.push('containerType'); }
            if (subjectData.containerCount) { next.containerCount = subjectData.containerCount; populated.push('containerCount'); }
            return next;
          });
        } else {
          setParseError('Quote email parsed but no route data found. Fill in the form manually.');
        }

      } else {
        setParseError('Only PDF and .msg files are supported for auto-population.');
        return;
      }

      if (populated.length > 0) {
        setParsedFrom(file.name);
        setPopulatedFields(populated);
      }

    } catch (err) {
      console.error('Document parse error:', err);
      setParseError('Error reading file: ' + err.message);
    } finally {
      setParsing(false);
    }
  }, []);

  // ─── Form helpers ─────────────────────────────────────────────────────────

  const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 14, border: `1px solid ${T.border1}`, background: T.bg3, color: T.text0, outline: "none" };
  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 6 };
  const sectionStyle = { marginBottom: 20 };
  const modeOptions = [{ id: "ocean", label: "Ocean", icon: Ship }, { id: "air", label: "Air", icon: Plane }, { id: "truck", label: "Truck", icon: Truck }];
  const statusOptions = [{ id: "planned", label: "Planned" }, { id: "booked", label: "Booked" }, { id: "in_transit", label: "In Transit" }, { id: "arrived", label: "Arrived" }, { id: "delivered", label: "Delivered" }];

  const generateMilestones = () => {
    const ms = []; let idx = 1;
    ms.push({ id: `m${idx++}`, label: "Cargo Ready", date: null, done: false });
    if (form.mode === "ocean") { ms.push({ id: `m${idx++}`, label: "S/I Cut-off", date: null, done: false }); ms.push({ id: `m${idx++}`, label: "VGM Cut-off", date: null, done: false }); }
    if (form.mode === "air") ms.push({ id: `m${idx++}`, label: "Booking Confirmed", date: null, done: false });
    const oName = form.origin?.split(",")[0]?.trim() || "Origin";
    const dName = form.destination?.split(",")[0]?.trim() || "Destination";
    ms.push({ id: `m${idx++}`, label: `ETD ${oName}`, date: form.etd || null, done: false });
    ms.push({ id: `m${idx++}`, label: `ETA ${dName}`, date: form.eta || null, done: false });
    ms.push({ id: `m${idx++}`, label: "Customs Clearance", date: null, done: false });
    ms.push({ id: `m${idx++}`, label: "Delivered", date: null, done: false });
    return ms;
  };

  const handleSave = () => {
    if (!form.origin || !form.destination) return;
    const containerLabel = formatContainer(form.containerType, form.containerCount);
    const shipment = {
      id: crypto.randomUUID(),
      ref: form.refManual && form.ref ? form.ref : "",
      refPending: !form.refManual || !form.ref,
      nextRefSuggestion: nextRef,
      projectId: form.projectId || null, customerRef: form.customerRef || null,
      mode: form.mode, status: form.status, origin: form.origin, destination: form.destination,
      vessel: form.vessel || "TBD", voyage: form.voyage || "TBD", carrier: form.carrier,
      routing: form.routing || `${form.origin} → ${form.destination}`,
      etd: form.etd || null, eta: form.eta || null,
      containerType: containerLabel, containerTypeId: form.containerType, containerCount: form.containerCount,
      milestones: generateMilestones(),
      costs: { quoted: parseFloat(form.quotedAmount) || 0, items: [], running: [] },
      co2e: co2 ? { kg: co2.co2eKg, distanceKm: co2.distanceKm, mode: co2.mode } : null,
      // Phase C: carry parsed metadata
      blNumber: form._blNumber || null,
      quotationNumber: form._quotationNumber || null,
      _parsedQuote: form._parsedQuote || null,
    };
    let newProject = null;
    if (showNewProject && newProjectName) {
      newProject = { id: crypto.randomUUID(), name: newProjectName.toUpperCase(), customer: newProjectCustomer, status: "active" };
      shipment.projectId = newProject.id;
    }
    onSave(shipment, newProject);
  };

  const canSave = form.origin && form.destination;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", width: 640, maxHeight: "90vh", overflow: "auto", background: T.bg2, borderRadius: 16, border: `1px solid ${T.border1}`, boxShadow: `0 24px 80px ${T.shadowHeavy}` }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: `1px solid ${T.border1}`, position: "sticky", top: 0, background: T.bg2, zIndex: 1, borderRadius: "16px 16px 0 0" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text0 }}>New Shipment</h2>
            <div style={{ fontSize: 12, color: T.text3, marginTop: 2 }}>Next ref: {nextRef}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.text2, cursor: "pointer", padding: 4 }}><X size={20} /></button>
        </div>

        <div style={{ padding: "20px 24px" }}>

          {/* ── DOCUMENT DROP ZONE (top of form) ── */}
          <DocDropZone T={T} onFileDrop={handleFileDrop} parsing={parsing} error={parseError && !populatedFields ? parseError : null} />

          {/* Parse success banner */}
          <ParseBanner
            populated={populatedFields}
            docName={parsedFrom}
            T={T}
            onDismiss={() => { setPopulatedFields(null); setParsedFrom(null); }}
          />

          {/* Duplicate warning */}
          {duplicateWarning && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: T.amberBg, border: `1px solid ${T.amberBorder}`, marginBottom: 16, fontSize: 13, color: T.amber }}>
              <AlertTriangle size={14} /> {duplicateWarning}
            </div>
          )}

          {/* Template selector */}
          {templates.length > 0 && (
            <div style={{ ...sectionStyle, display: "flex", alignItems: "center", gap: 8 }}>
              <Bookmark size={14} color={T.text3} />
              <select onChange={e => { if (e.target.value) applyTemplate(e.target.value); }}
                defaultValue=""
                style={{ flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 13, border: `1px solid ${T.border1}`, background: T.bg3, color: T.text2, cursor: "pointer" }}>
                <option value="">Use a template…</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {(form.origin || form.carrier) && (
                <button onClick={() => setForm(f => ({ ...f, origin: "", destination: "", carrier: "", vessel: "TBD", voyage: "TBD", routing: "" }))}
                  style={{ padding: "8px 12px", borderRadius: 8, fontSize: 12, color: T.text2, background: T.bg3, border: `1px solid ${T.border1}`, cursor: "pointer", whiteSpace: "nowrap" }}>Clear</button>
              )}
            </div>
          )}

          {/* Reference */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Internal Reference</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={form.refManual ? form.ref : nextRef}
                onChange={e => { set("ref", e.target.value); set("refManual", true); }}
                placeholder={nextRef}
                style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace", flex: 1 }}
              />
              {form.refManual && (
                <button onClick={() => { set("ref", ""); set("refManual", false); }}
                  style={{ padding: "8px 12px", borderRadius: 8, fontSize: 12, color: T.text2, background: T.bg3, border: `1px solid ${T.border1}`, cursor: "pointer" }}>Reset</button>
              )}
            </div>
          </div>

          {/* Project */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Project (optional)</label>
            {!showNewProject ? (
              <div style={{ display: "flex", gap: 8 }}>
                <select value={form.projectId} onChange={e => set("projectId", e.target.value)} style={{ ...inputStyle, flex: 1, cursor: "pointer" }}>
                  <option value="">No project (loose shipment)</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name} — {p.customer}</option>)}
                </select>
                <button onClick={() => setShowNewProject(true)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: T.accent, background: T.accentGlow, border: "1px solid rgba(59,130,246,0.2)", cursor: "pointer", whiteSpace: "nowrap" }}><Plus size={14} /> New</button>
              </div>
            ) : (
              <div style={{ padding: 12, borderRadius: 8, background: T.bg3, border: `1px solid ${T.border1}` }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}><label style={{ ...labelStyle, fontSize: 11 }}>Project Name</label><input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="e.g. USGOLD" style={inputStyle} /></div>
                  <div style={{ flex: 1 }}><label style={{ ...labelStyle, fontSize: 11 }}>Customer</label><input value={newProjectCustomer} onChange={e => setNewProjectCustomer(e.target.value)} placeholder="e.g. US Gold Mining Corp" style={inputStyle} /></div>
                </div>
                <button onClick={() => { setShowNewProject(false); setNewProjectName(""); setNewProjectCustomer(""); }} style={{ fontSize: 12, color: T.text2, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Cancel</button>
              </div>
            )}
          </div>

          {(form.projectId || showNewProject) && (
            <div style={sectionStyle}>
              <label style={labelStyle}>Customer Shipment Reference</label>
              <input value={form.customerRef} onChange={e => set("customerRef", e.target.value)} placeholder="e.g. USGOLD 4" style={inputStyle} />
            </div>
          )}

          {/* Mode */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Transport Mode</label>
            <div style={{ display: "flex", gap: 8 }}>
              {modeOptions.map(m => (
                <button key={m.id} onClick={() => { set("mode", m.id); set("carrier", ""); if (m.id === "ocean") set("containerType", "40HC"); else if (m.id === "air") set("containerType", "AIR"); else set("containerType", "FTL"); }}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 16px", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer",
                    background: form.mode === m.id ? T.accentGlow : T.bg3, color: form.mode === m.id ? T.accent : T.text2,
                    border: `1px solid ${form.mode === m.id ? "rgba(59,130,246,0.3)" : T.border1}` }}>
                  <m.icon size={16} /> {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Status</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {statusOptions.map(s => (
                <button key={s.id} onClick={() => set("status", s.id)}
                  style={{ padding: "6px 12px", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer",
                    background: form.status === s.id ? T.accent : T.bg3, color: form.status === s.id ? "white" : T.text2,
                    border: `1px solid ${form.status === s.id ? T.accent : T.border1}` }}>{s.label}</button>
              ))}
            </div>
          </div>

          {/* Origin / Destination */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, ...sectionStyle }}>
            <PortSelect T={T} value={form.origin} label="Origin *" placeholder="e.g. Helsinki"
              onChange={(val, port) => { set("origin", val); if (port) set("originPort", port); }} />
            <PortSelect T={T} value={form.destination} label="Destination *" placeholder="e.g. Houston"
              onChange={(val, port) => { set("destination", val); if (port) set("destinationPort", port); }} />
          </div>

          {/* Carrier */}
          <div style={sectionStyle}>
            <CarrierSelect T={T} value={form.carrier} mode={form.mode} label="Carrier"
              onChange={(val) => set("carrier", val)} />
          </div>

          {/* Container */}
          <div style={sectionStyle}>
            <ContainerSelect T={T} mode={form.mode}
              containerType={form.containerType} containerCount={form.containerCount}
              onTypeChange={val => set("containerType", val)} onCountChange={val => set("containerCount", val)} />
          </div>

          {/* Vessel / Voyage */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, ...sectionStyle }}>
            <div>
              <label style={labelStyle}>{form.mode === "ocean" ? "Vessel" : form.mode === "air" ? "Flight" : "Vehicle"}</label>
              <input value={form.vessel} onChange={e => set("vessel", e.target.value)} placeholder="TBD" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Voyage / Flight No.</label>
              <input value={form.voyage} onChange={e => set("voyage", e.target.value)} placeholder="TBD" style={inputStyle} />
            </div>
          </div>

          {/* Dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, ...sectionStyle }}>
            <div><label style={labelStyle}>ETD</label><input type="date" value={form.etd} onChange={e => set("etd", e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>ETA</label><input type="date" value={form.eta} onChange={e => set("eta", e.target.value)} style={inputStyle} /></div>
          </div>

          {/* Parsed metadata (if any — displayed as read-only info) */}
          {(form._blNumber || form._quotationNumber) && (
            <div style={{ padding: "12px 14px", borderRadius: 8, background: T.bg3, border: `1px solid ${T.border1}`, marginBottom: 20, display: 'flex', gap: 20 }}>
              {form._blNumber && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: T.text3, letterSpacing: '0.05em', marginBottom: 3 }}>BL / SWB</div>
                  <div style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: T.text1 }}>{form._blNumber}</div>
                </div>
              )}
              {form._quotationNumber && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: T.text3, letterSpacing: '0.05em', marginBottom: 3 }}>Quotation No.</div>
                  <div style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: T.text1 }}>{form._quotationNumber}</div>
                </div>
              )}
            </div>
          )}

          {/* Quoted amount */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Quoted Amount to Customer (EUR)</label>
            <input type="number" value={form.quotedAmount} onChange={e => set("quotedAmount", e.target.value)} placeholder="0" style={inputStyle} />
          </div>

          {/* CO2 estimate */}
          {co2 && co2.co2eKg > 0 && (
            <div style={{ padding: 14, borderRadius: 10, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Leaf size={18} color={T.green} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.green }}>{formatCO2e(co2.co2eKg)}</div>
                <div style={{ fontSize: 11, color: T.text3 }}>{co2.details} • ~{co2.distanceKm.toLocaleString()} km</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "16px 24px", borderTop: `1px solid ${T.border1}`, position: "sticky", bottom: 0, background: T.bg2, borderRadius: "0 0 16px 16px" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 500, color: T.text2, background: T.bg3, border: `1px solid ${T.border1}`, cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSave} disabled={!canSave}
            style={{ padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600, color: canSave ? "white" : T.text3, background: canSave ? T.accent : T.bg4, border: "none", cursor: canSave ? "pointer" : "not-allowed", opacity: canSave ? 1 : 0.5 }}>
            Create Shipment
          </button>
        </div>
      </div>
    </div>
  );
}
