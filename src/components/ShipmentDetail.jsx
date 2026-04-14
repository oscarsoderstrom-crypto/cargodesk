import { useState, useEffect } from "react";
import { ChevronLeft, Eye, DollarSign, FileText, CheckCircle2, Circle, Clock, Settings, X, Check, Plus, Trash2, Ship, Plane, Truck, FolderOpen, Leaf, MessageSquare, ChevronDown, Printer, Calendar, FileDown, Bookmark, AlertTriangle, Receipt } from "lucide-react";
import CostsTab from "./CostsTab.jsx";
import DocumentsTab from "./DocumentsTab.jsx";
import NotesTab from "./NotesTab.jsx";
import PortSelect from "./PortSelect.jsx";
import CarrierSelect from "./CarrierSelect.jsx";
import ContainerSelect from "./ContainerSelect.jsx";
import { updateShipment } from "../db/schema.js";
import { toEUR, formatEUR } from "../utils/currency.js";
import { formatContainer } from "../utils/containers.js";
import { generateCMR, hasTruckingLeg } from "../utils/cmrGenerator.js";
import { generateShipmentSummary } from "../utils/shipmentPdf.js";
import { addTemplate, addActivity } from "../db/schema.js";

const MODE_ICON = { ocean: Ship, air: Plane, truck: Truck };
const STATUS_OPTIONS = [
  { id: "planned", label: "Planned" }, { id: "booked", label: "Booked" },
  { id: "in_transit", label: "In Transit" }, { id: "arrived", label: "Arrived" },
  { id: "delivered", label: "Delivered" }, { id: "completed", label: "Completed" },
];

export default function ShipmentDetail({ T, shipment, project, statusCfg, onBack, onToggleMilestone, onUpdate, rates }) {
  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editMilestones, setEditMilestones] = useState([]);
  const [billingDone, setBillingDone] = useState(shipment.billingDone || false);

  // Sync billingDone if shipment prop changes
  useEffect(() => { setBillingDone(shipment.billingDone || false); }, [shipment.id, shipment.billingDone]);

  const milestones = shipment.milestones || [];
  const mono = "'JetBrains Mono',monospace";

  const totalCost = (shipment.costs?.items || []).reduce((s, c) => s + toEUR(c.amount, c.currency, rates), 0) +
    (shipment.costs?.running || []).reduce((s, r) => {
      const days = r.status === "running"
        ? Math.max(1, Math.ceil((new Date() - new Date(r.startDate)) / 86400000))
        : (r.totalDays || 0);
      return s + toEUR(r.dailyRate * days, r.currency, rates);
    }, 0);

  const quoted = shipment.costs?.quoted || 0;
  const margin = quoted - totalCost;
  const marginPct = quoted > 0 ? (margin / quoted * 100) : 0;

  // Cost variance: warn if actual costs exceed quoted by more than 10%
  const costVariance = quoted > 0 && totalCost > quoted * 1.1;
  const variancePct = quoted > 0 ? ((totalCost - quoted) / quoted * 100) : 0;

  const SC = statusCfg;
  const Badge = ({ status }) => {
    const c = SC[status]; if (!c) return null;
    return <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.ring}`, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{c.label}</span>;
  };
  const MIcon = ({ mode, size = 15 }) => {
    const I = MODE_ICON[mode] || Ship;
    const colors = { ocean: T.modeOcean, air: T.modeAir, truck: T.modeTruck };
    return <I size={size} color={colors[mode] || T.text2} />;
  };
  const fmtDate = d => { if (!d || d === "—") return "—"; return new Date(d).toLocaleDateString("fi-FI", { day: "numeric", month: "short", year: "numeric" }); };
  const daysUntil = d => { if (!d || d === "—") return null; return Math.ceil((new Date(d) - new Date()) / 86400000); };

  const tabs = [
    { id: "overview",   label: "Overview",   icon: Eye },
    { id: "costs",      label: "Costs",      icon: DollarSign },
    { id: "documents",  label: "Documents",  icon: FileText },
    { id: "milestones", label: "Milestones", icon: CheckCircle2 },
    { id: "notes",      label: "Notes",      icon: MessageSquare },
  ];

  const inputStyle = { width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 14, border: `1px solid ${T.border1}`, background: T.bg3, color: T.text0, outline: "none" };
  const labelStyle = { display: "block", fontSize: 11, fontWeight: 600, color: T.text3, marginBottom: 4 };

  const startEditing = () => {
    setEditForm({
      ref: shipment.ref || "",
      status: shipment.status,
      origin: shipment.origin || "",
      destination: shipment.destination || "",
      carrier: shipment.carrier || "",
      vessel: shipment.vessel || "",
      voyage: shipment.voyage || "",
      routing: shipment.routing || "",
      containerTypeId: shipment.containerTypeId || "40HC",
      containerCount: shipment.containerCount || 1,
      etd: shipment.etd || "",
      eta: shipment.eta || "",
      mode: shipment.mode || "ocean",
      customerRef: shipment.customerRef || "",
    });
    setEditMilestones((shipment.milestones || []).map(m => ({ ...m })));
    setEditing(true);
  };

  const cancelEditing = () => { setEditing(false); };

  const saveEdits = async () => {
    const changes = {};
    if (tab === "overview") {
      const containerLabel = formatContainer(editForm.containerTypeId, editForm.containerCount);
      Object.assign(changes, {
        ref: editForm.ref, status: editForm.status, origin: editForm.origin, destination: editForm.destination,
        carrier: editForm.carrier, vessel: editForm.vessel, voyage: editForm.voyage,
        routing: editForm.routing || `${editForm.origin} → ${editForm.destination}`,
        containerType: containerLabel, containerTypeId: editForm.containerTypeId, containerCount: editForm.containerCount,
        etd: editForm.etd || null, eta: editForm.eta || null, mode: editForm.mode,
        customerRef: editForm.customerRef || null,
      });
    } else if (tab === "milestones") {
      changes.milestones = editMilestones.filter(m => m.label.trim());
    }
    await updateShipment(shipment.id, changes);
    setEditing(false);
    if (onUpdate) onUpdate();
  };

  const setField = (key, val) => setEditForm(f => ({ ...f, [key]: val }));

  const addMilestone = () => {
    setEditMilestones(prev => [...prev, { id: `m${Date.now()}`, label: "", date: null, done: false }]);
  };
  const removeMilestone = (id) => { setEditMilestones(prev => prev.filter(m => m.id !== id)); };
  const updateMilestone = (id, key, val) => {
    setEditMilestones(prev => prev.map(m => m.id === id ? { ...m, [key]: val } : m));
  };

  // Toggle billing done
  const handleBillingToggle = async () => {
    const next = !billingDone;
    setBillingDone(next);
    await updateShipment(shipment.id, { billingDone: next });
    await addActivity({
      id: crypto.randomUUID(), type: "cost",
      message: `Billing marked ${next ? "complete" : "incomplete"} on ${shipment.ref || shipment.customerRef || "shipment"}`,
      shipmentId: shipment.id, timestamp: new Date().toISOString(),
    });
    if (onUpdate) onUpdate();
  };

  const transitDays = (shipment.etd && shipment.eta) ? Math.ceil((new Date(shipment.eta) - new Date(shipment.etd)) / 86400000) : null;
  const showCMR = hasTruckingLeg(shipment);
  const co2e = shipment.co2e;

  return (
    <div style={{ height: "100%", overflow: "auto", background: T.bg1 }}>

      {/* Header */}
      <div style={{ padding: 24, borderBottom: `1px solid ${T.border1}`, background: `linear-gradient(180deg,${T.bg2} 0%,${T.bg1} 100%)` }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14, marginBottom: 16, padding: "4px 8px", borderRadius: 4, color: T.text2, background: "none", border: "none", cursor: "pointer" }}>
          <ChevronLeft size={16} /> Back
        </button>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
              <MIcon mode={shipment.mode} size={22} />
              <h1 style={{ fontSize: 24, fontWeight: 700, color: T.text0, fontFamily: mono, margin: 0 }}>
                {shipment.ref || <span style={{ color: T.text3, fontStyle: "italic" }}>Ref pending</span>}
              </h1>
              <Badge status={shipment.status} />

              {/* Billing done badge — shown for delivered shipments */}
              {(shipment.status === "delivered" || shipment.status === "completed") && (
                <button
                  onClick={handleBillingToggle}
                  title={billingDone ? "Billing complete — click to unmark" : "Mark billing as complete"}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                    cursor: "pointer", transition: "all 0.15s",
                    background: billingDone ? T.greenBg : T.amberBg,
                    color: billingDone ? T.green : T.amber,
                    border: `1px solid ${billingDone ? T.greenBorder : T.amberBorder}`,
                  }}
                >
                  <Receipt size={11} />
                  {billingDone ? "Billing done" : "Billing pending"}
                </button>
              )}
            </div>

            {project && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, marginBottom: 4 }}>
                <FolderOpen size={14} color={T.text2} />
                <span style={{ color: T.text2 }}>Project: <strong style={{ color: T.text0 }}>{project.name}</strong></span>
                {shipment.customerRef && <span style={{ color: T.text3 }}>• {shipment.customerRef}</span>}
              </div>
            )}

            <div style={{ fontSize: 14, marginTop: 8, color: T.text1 }}>
              <strong>{shipment.origin}</strong> → <strong>{shipment.destination}</strong>
              <span style={{ margin: "0 8px", color: T.border2 }}>|</span>
              {shipment.carrier} • {shipment.containerType}
            </div>

            {/* Info badges */}
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {transitDays && transitDays > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, padding: "3px 8px", borderRadius: 4, background: T.bg4, color: T.text2 }}>
                  <Calendar size={11} /> {transitDays} days transit
                </span>
              )}
              {co2e && co2e.kg > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, padding: "3px 8px", borderRadius: 4, background: "rgba(16,185,129,0.08)", color: T.green, border: "1px solid rgba(16,185,129,0.15)" }}>
                  <Leaf size={11} /> {co2e.kg >= 1000 ? `${(co2e.kg / 1000).toFixed(2)} t` : `${co2e.kg} kg`} CO₂e
                </span>
              )}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, color: T.text2 }}>Margin</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: margin >= 0 ? T.green : T.red, fontFamily: mono }}>{formatEUR(margin)}</div>
            <div style={{ fontSize: 12, color: margin >= 0 ? T.green : T.red }}>{marginPct.toFixed(1)}%</div>

            {/* Cost variance warning */}
            {costVariance && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6, padding: "4px 8px", borderRadius: 6, background: T.redBg, border: `1px solid ${T.redBorder}`, color: T.red, fontSize: 11, fontWeight: 600 }}>
                <AlertTriangle size={11} />
                Costs {variancePct.toFixed(0)}% over quoted
              </div>
            )}

            {/* Quick actions */}
            <div style={{ display: "flex", gap: 6, marginTop: 12, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button onClick={() => generateShipmentSummary(shipment, project, { totalCost })}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, color: T.text2, background: T.bg3, border: `1px solid ${T.border1}`, cursor: "pointer" }}>
                <FileDown size={12} /> Export PDF
              </button>
              {showCMR && (
                <button onClick={() => generateCMR(shipment, project)}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, color: T.accent, background: T.accentGlow, border: `1px solid rgba(59,130,246,0.2)`, cursor: "pointer" }}>
                  <Printer size={12} /> Print CMR
                </button>
              )}
              <button onClick={async () => {
                const template = {
                  id: crypto.randomUUID(), name: `${shipment.origin} → ${shipment.destination} (${shipment.carrier})`,
                  mode: shipment.mode, origin: shipment.origin, destination: shipment.destination,
                  carrier: shipment.carrier, containerType: shipment.containerType,
                  containerTypeId: shipment.containerTypeId, containerCount: shipment.containerCount,
                  routing: shipment.routing, projectId: shipment.projectId,
                };
                await addTemplate(template);
                await addActivity({ id: crypto.randomUUID(), type: "shipment", message: `Template saved: ${template.name}`, shipmentId: shipment.id, timestamp: new Date().toISOString() });
                if (onUpdate) onUpdate();
                alert("Template saved! Use it when creating new shipments.");
              }}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, color: T.amber, background: T.amberBg, border: `1px solid ${T.amberBorder}`, cursor: "pointer" }}>
                <Bookmark size={12} /> Save Template
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", alignItems: "center", paddingLeft: 24, paddingRight: 16, borderBottom: `1px solid ${T.border1}`, background: T.bg2 }}>
        <div style={{ display: "flex", gap: 0, flex: 1 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setEditing(false); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", fontSize: 14, fontWeight: 500, color: tab === t.id ? T.accent : T.text2, background: "none", border: "none", borderBottom: `2px solid ${tab === t.id ? T.accent : "transparent"}`, marginBottom: -1, cursor: "pointer" }}>
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>
        {(tab === "overview" || tab === "milestones") && !editing && (
          <button onClick={startEditing}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, color: T.text2, background: T.bg3, border: `1px solid ${T.border1}`, cursor: "pointer" }}
            onMouseEnter={e => { e.currentTarget.style.color = T.accent; e.currentTarget.style.borderColor = T.accent; }}
            onMouseLeave={e => { e.currentTarget.style.color = T.text2; e.currentTarget.style.borderColor = T.border1; }}>
            <Settings size={14} /> Edit
          </button>
        )}
        {editing && (
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={cancelEditing}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, color: T.text2, background: T.bg3, border: `1px solid ${T.border1}`, cursor: "pointer" }}>
              <X size={13} /> Cancel
            </button>
            <button onClick={saveEdits}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, color: "white", background: T.green, border: "none", cursor: "pointer" }}>
              <Check size={13} /> Save
            </button>
          </div>
        )}
      </div>

      <div style={{ padding: 24 }}>

        {/* ===== OVERVIEW TAB ===== */}
        {tab === "overview" && !editing && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, color: T.text2 }}>Transport Details</h3>
              <div style={{ background: T.bg2, borderRadius: 10, border: `1px solid ${T.border1}` }}>
                {[
                  ["Vessel / Vehicle", shipment.vessel || "—"],
                  ["Voyage", shipment.voyage || "—"],
                  ["Carrier", shipment.carrier || "—"],
                  ["Routing", shipment.routing || "—"],
                  ["Container / Cargo", shipment.containerType || "—"],
                  ["ETD", fmtDate(shipment.etd)],
                  ["ETA", fmtDate(shipment.eta)],
                ].map(([l, v], i) =>
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderBottom: i < 6 ? `1px solid ${T.border0}` : "none" }}>
                    <span style={{ fontSize: 14, color: T.text2 }}>{l}</span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: T.text0 }}>{v}</span>
                  </div>
                )}
              </div>

              {/* BL / Quotation numbers if present */}
              {(shipment.blNumber || shipment.quotationNumber) && (
                <div style={{ marginTop: 12, background: T.bg2, borderRadius: 10, border: `1px solid ${T.border1}` }}>
                  {shipment.blNumber && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderBottom: shipment.quotationNumber ? `1px solid ${T.border0}` : "none" }}>
                      <span style={{ fontSize: 14, color: T.text2 }}>BL / SWB</span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: T.text0, fontFamily: mono }}>{shipment.blNumber}</span>
                    </div>
                  )}
                  {shipment.quotationNumber && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px" }}>
                      <span style={{ fontSize: 14, color: T.text2 }}>Quotation No.</span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: T.text0, fontFamily: mono }}>{shipment.quotationNumber}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, color: T.text2 }}>Milestone Progress</h3>
              {milestones.map((m, i) => {
                const d = daysUntil(m.date);
                const isNext = !m.done && (i === 0 || milestones[i - 1].done);
                return (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 8, borderRadius: 8, marginBottom: 4, background: isNext ? T.accentGlow : "transparent" }}>
                    <button onClick={() => onToggleMilestone(shipment.id, m.id)} style={{ flexShrink: 0, cursor: "pointer", color: m.done ? T.green : T.text3, background: "none", border: "none", padding: 0 }}>
                      {m.done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                    </button>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 14, color: m.done ? T.text3 : T.text0, textDecoration: m.done ? "line-through" : "none" }}>{m.label}</span>
                    </div>
                    <span style={{ fontSize: 12, color: T.text3, fontFamily: mono }}>{m.date ? fmtDate(m.date) : "TBD"}</span>
                    {d !== null && !m.done && d <= 3 && d >= 0 && (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: d <= 1 ? T.redBg : T.amberBg, color: d <= 1 ? T.red : T.amber }}>
                        {d === 0 ? "TODAY" : `${d}d`}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== OVERVIEW EDIT MODE ===== */}
        {tab === "overview" && editing && (
          <div>
            <div style={{ padding: 16, borderRadius: 10, background: T.bg3, border: `1px solid ${T.accent}30`, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
                <Settings size={14} color={T.accent} />
                <span style={{ fontSize: 13, fontWeight: 600, color: T.accent }}>Editing Transport Details</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Reference Number</label>
                  <input value={editForm.ref} onChange={e => setField("ref", e.target.value)} placeholder="S26XXXXXXXX" style={{ ...inputStyle, fontFamily: mono }} />
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {STATUS_OPTIONS.map(s => (
                      <button key={s.id} onClick={() => setField("status", s.id)}
                        style={{ padding: "5px 10px", borderRadius: 5, fontSize: 12, fontWeight: 500, cursor: "pointer",
                          background: editForm.status === s.id ? T.accent : T.bg4, color: editForm.status === s.id ? "white" : T.text2,
                          border: `1px solid ${editForm.status === s.id ? T.accent : T.border1}` }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Customer Reference</label>
                <input value={editForm.customerRef} onChange={e => setField("customerRef", e.target.value)} placeholder="e.g. USGOLD 4" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Transport Mode</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[{ id: "ocean", label: "Ocean", icon: Ship }, { id: "air", label: "Air", icon: Plane }, { id: "truck", label: "Truck", icon: Truck }].map(m => (
                    <button key={m.id} onClick={() => setField("mode", m.id)}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 12px", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer",
                        background: editForm.mode === m.id ? T.accentGlow : T.bg4, color: editForm.mode === m.id ? T.accent : T.text2,
                        border: `1px solid ${editForm.mode === m.id ? "rgba(59,130,246,0.3)" : T.border1}` }}>
                      <m.icon size={14} /> {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <PortSelect T={T} value={editForm.origin} label="Origin" placeholder="e.g. Helsinki" onChange={val => setField("origin", val)} />
                <PortSelect T={T} value={editForm.destination} label="Destination" placeholder="e.g. Houston" onChange={val => setField("destination", val)} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <CarrierSelect T={T} value={editForm.carrier} mode={editForm.mode} label="Carrier" onChange={val => setField("carrier", val)} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <ContainerSelect T={T} mode={editForm.mode}
                  containerType={editForm.containerTypeId} containerCount={editForm.containerCount}
                  onTypeChange={val => setField("containerTypeId", val)} onCountChange={val => setField("containerCount", val)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div><label style={labelStyle}>Vessel / Vehicle</label><input value={editForm.vessel} onChange={e => setField("vessel", e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Voyage / Flight No.</label><input value={editForm.voyage} onChange={e => setField("voyage", e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Routing</label>
                <input value={editForm.routing} onChange={e => setField("routing", e.target.value)} placeholder="e.g. Helsinki → Rotterdam → Houston" style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={labelStyle}>ETD</label><input type="date" value={editForm.etd} onChange={e => setField("etd", e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>ETA</label><input type="date" value={editForm.eta} onChange={e => setField("eta", e.target.value)} style={inputStyle} /></div>
              </div>
            </div>
          </div>
        )}

        {/* ===== COSTS TAB ===== */}
        {tab === "costs" && <CostsTab T={T} shipment={shipment} rates={rates} onUpdate={onUpdate} />}

        {/* ===== DOCUMENTS TAB ===== */}
        {tab === "documents" && <DocumentsTab T={T} shipment={shipment} onDocumentAdded={onUpdate} />}

        {/* ===== MILESTONES TAB (view) ===== */}
        {tab === "milestones" && !editing && (
          <div style={{ maxWidth: 540 }}>
            {milestones.map((m, i) => {
              const d = daysUntil(m.date);
              const isFirstUndone = !m.done && (i === 0 || milestones[i - 1].done);
              return (
                <div key={m.id} style={{ display: "flex", gap: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <button onClick={() => onToggleMilestone(shipment.id, m.id)} style={{ cursor: "pointer", color: m.done ? T.green : T.text3, background: "none", border: "none", padding: 0 }}>
                      {m.done ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                    </button>
                    {i < milestones.length - 1 && <div style={{ width: 2, flex: 1, background: m.done ? T.greenBorder : T.border1, minHeight: 32 }} />}
                  </div>
                  <div style={{ paddingBottom: 24, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: m.done ? T.text3 : T.text0 }}>{m.label}</div>
                      {!m.done && i > 0 && !milestones[i - 1].done && (
                        <button onClick={async () => {
                          const { updateShipment: us } = await import("../db/schema.js");
                          const updated = milestones.map((ms, idx) => idx <= i ? { ...ms, done: true } : ms);
                          await us(shipment.id, { milestones: updated });
                          if (onUpdate) onUpdate();
                        }}
                          style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, color: T.accent, background: T.accentGlow, border: `1px solid rgba(59,130,246,0.2)`, cursor: "pointer", fontWeight: 500 }}>
                          Mark all up to here
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: T.text3 }}>
                      {m.date ? fmtDate(m.date) : "TBD"}
                      {d !== null && !m.done && d >= 0 && d <= 7 && (
                        <span style={{ marginLeft: 8, fontWeight: 700, color: d <= 2 ? T.red : T.amber }}>
                          ({d === 0 ? "today" : `in ${d} days`})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ===== MILESTONES EDIT MODE ===== */}
        {tab === "milestones" && editing && (
          <div>
            <div style={{ padding: 16, borderRadius: 10, background: T.bg3, border: `1px solid ${T.accent}30`, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
                <Settings size={14} color={T.accent} />
                <span style={{ fontSize: 13, fontWeight: 600, color: T.accent }}>Editing Milestones</span>
              </div>
              {editMilestones.map((m, i) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "8px 0", borderBottom: i < editMilestones.length - 1 ? `1px solid ${T.border0}` : "none" }}>
                  <div style={{ width: 28, display: "flex", justifyContent: "center" }}>
                    <button onClick={() => updateMilestone(m.id, "done", !m.done)} style={{ cursor: "pointer", color: m.done ? T.green : T.text3, background: "none", border: "none", padding: 0 }}>
                      {m.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>
                  </div>
                  <input value={m.label} onChange={e => updateMilestone(m.id, "label", e.target.value)} placeholder="Milestone name" style={{ ...inputStyle, flex: 1 }} />
                  <input type="date" value={m.date || ""} onChange={e => updateMilestone(m.id, "date", e.target.value || null)} style={{ ...inputStyle, width: 160 }} />
                  <button onClick={() => removeMilestone(m.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: T.text3, padding: 4 }}
                    onMouseEnter={e => e.currentTarget.style.color = T.red}
                    onMouseLeave={e => e.currentTarget.style.color = T.text3}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button onClick={addMilestone}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 6, fontSize: 13, fontWeight: 500, color: T.accent, background: "none", border: `1px dashed ${T.border2}`, cursor: "pointer", marginTop: 8 }}>
                <Plus size={14} /> Add Milestone
              </button>
            </div>
          </div>
        )}

        {/* ===== NOTES TAB ===== */}
        {tab === "notes" && <NotesTab T={T} shipment={shipment} onUpdate={onUpdate} />}
      </div>
    </div>
  );
}
