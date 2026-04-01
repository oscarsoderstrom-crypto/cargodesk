import { useState, useEffect } from "react";
import { X, Ship, Plane, Truck, Plus, Leaf } from "lucide-react";
import PortSelect from "./PortSelect.jsx";
import ContainerSelect from "./ContainerSelect.jsx";
import CarrierSelect from "./CarrierSelect.jsx";
import { findPort, routeDistanceKm } from "../utils/ports.js";
import { formatContainer, getContainerType } from "../utils/containers.js";
import { calculateCO2e, formatCO2e } from "../utils/co2Calculator.js";

export default function NewShipmentModal({ T, projects, nextRef, onSave, onClose }) {
  const [form, setForm] = useState({
    ref: "", refManual: false, projectId: "", customerRef: "",
    mode: "ocean", status: "planned",
    origin: "", originPort: null, destination: "", destinationPort: null,
    vessel: "TBD", voyage: "TBD", carrier: "", routing: "",
    etd: "", eta: "", containerType: "40HC", containerCount: 1, quotedAmount: 0,
  });
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectCustomer, setNewProjectCustomer] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [co2, setCo2] = useState(null);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

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
    };
    let newProject = null;
    if (showNewProject && newProjectName) {
      newProject = { id: crypto.randomUUID(), name: newProjectName.toUpperCase(), customer: newProjectCustomer, status: "active" };
      shipment.projectId = newProject.id;
    }
    onSave(shipment, newProject);
  };

  const canSave = form.origin && form.destination;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", width: 640, maxHeight: "90vh", overflow: "auto", background: T.bg2, borderRadius: 16, border: `1px solid ${T.border1}`, boxShadow: `0 24px 80px ${T.shadowHeavy}` }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: `1px solid ${T.border1}`, position: "sticky", top: 0, background: T.bg2, zIndex: 1, borderRadius: "16px 16px 0 0" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text0 }}>New Shipment</h2>
            <div style={{ fontSize: 13, color: T.text2, marginTop: 2 }}>
              {form.refManual && form.ref
                ? <>Ref: <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, color: T.accent }}>{form.ref}</span></>
                : <span style={{ color: T.text3 }}>Reference pending — assigned from booking or manually</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.text2, padding: 4 }}><X size={20} /></button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Reference */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Shipment Reference (optional)</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={form.ref} onChange={e => set("ref", e.target.value)} onFocus={() => { if (!form.ref) set("ref", nextRef); set("refManual", true); }}
                placeholder={`Leave empty or click to use ${nextRef}`}
                style={{ ...inputStyle, flex: 1, fontFamily: "'JetBrains Mono',monospace" }} />
              {form.ref && <button onClick={() => { set("ref", ""); set("refManual", false); }}
                style={{ padding: "8px 12px", borderRadius: 8, fontSize: 12, color: T.text2, background: T.bg3, border: `1px solid ${T.border1}`, cursor: "pointer", whiteSpace: "nowrap" }}>Clear</button>}
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
            <div style={sectionStyle}><label style={labelStyle}>Customer Shipment Reference</label>
              <input value={form.customerRef} onChange={e => set("customerRef", e.target.value)} placeholder="e.g. USGOLD 4" style={inputStyle} /></div>
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

          {/* Carrier - styled autocomplete */}
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

          {/* Vessel */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, ...sectionStyle }}>
            <div><label style={labelStyle}>{form.mode === "ocean" ? "Vessel" : form.mode === "air" ? "Flight" : "Vehicle"}</label>
              <input value={form.vessel} onChange={e => set("vessel", e.target.value)} placeholder="TBD" style={inputStyle} /></div>
            <div><label style={labelStyle}>Voyage / Flight No.</label>
              <input value={form.voyage} onChange={e => set("voyage", e.target.value)} placeholder="TBD" style={inputStyle} /></div>
          </div>

          {/* Dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, ...sectionStyle }}>
            <div><label style={labelStyle}>ETD</label><input type="date" value={form.etd} onChange={e => set("etd", e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>ETA</label><input type="date" value={form.eta} onChange={e => set("eta", e.target.value)} style={inputStyle} /></div>
          </div>

          {/* Quoted */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Quoted Amount to Customer (EUR)</label>
            <input type="number" value={form.quotedAmount} onChange={e => set("quotedAmount", e.target.value)} placeholder="0" style={inputStyle} />
          </div>

          {/* CO2 */}
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
