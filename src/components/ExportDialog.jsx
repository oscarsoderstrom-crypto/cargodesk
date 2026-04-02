import { useState } from "react";
import { Download, X, FileSpreadsheet } from "lucide-react";
import { exportFinancials } from "../utils/excelExport.js";

export default function ExportDialog({ T, shipments, projects, rates, onClose }) {
  const [mode, setMode] = useState("profit_loss");
  const [groupBy, setGroupBy] = useState("shipment");
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const filename = exportFinancials({ shipments, projects, rates, mode, groupBy });
      setDone(true);
      setTimeout(() => { setDone(false); onClose(); }, 1500);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  const modes = [
    { id: "profit_loss", label: "Profit & Loss", desc: "Full breakdown: quoted, all costs, margins, plus detailed cost items" },
    { id: "profit_only", label: "Profit Only", desc: "Quoted amounts and margins only — no cost details" },
    { id: "costs_only", label: "Incoming Costs Only", desc: "All cost line items without quoted amounts or margins" },
  ];

  const groups = [
    { id: "shipment", label: "All Shipments", desc: "One sheet with all shipments in a single list" },
    { id: "project", label: "By Project", desc: "Separate sheet per project with a summary sheet" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", width: 480, background: T.bg2, borderRadius: 16, border: `1px solid ${T.border1}`, boxShadow: `0 24px 80px ${T.shadowHeavy}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: `1px solid ${T.border1}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FileSpreadsheet size={20} color={T.green} />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text0 }}>Export Financials</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.text2, padding: 4 }}><X size={20} /></button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Report type */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 8 }}>Report Type</label>
            {modes.map(m => (
              <div key={m.id} onClick={() => setMode(m.id)}
                style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 8, marginBottom: 6, cursor: "pointer",
                  background: mode === m.id ? T.accentGlow : T.bg3, border: `1px solid ${mode === m.id ? "rgba(59,130,246,0.3)" : T.border0}` }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${mode === m.id ? T.accent : T.border2}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  {mode === m.id && <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.accent }} />}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: mode === m.id ? T.accent : T.text0 }}>{m.label}</div>
                  <div style={{ fontSize: 12, color: T.text3, marginTop: 2 }}>{m.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Group by */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 8 }}>Group By</label>
            <div style={{ display: "flex", gap: 8 }}>
              {groups.map(g => (
                <div key={g.id} onClick={() => setGroupBy(g.id)}
                  style={{ flex: 1, padding: "10px 12px", borderRadius: 8, cursor: "pointer", textAlign: "center",
                    background: groupBy === g.id ? T.accentGlow : T.bg3, border: `1px solid ${groupBy === g.id ? "rgba(59,130,246,0.3)" : T.border0}` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: groupBy === g.id ? T.accent : T.text0 }}>{g.label}</div>
                  <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>{g.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div style={{ padding: 12, borderRadius: 8, background: T.bg3, border: `1px solid ${T.border0}`, fontSize: 12, color: T.text2, marginBottom: 16 }}>
            Exporting {shipments.length} shipment{shipments.length !== 1 ? "s" : ""} across {projects.length} project{projects.length !== 1 ? "s" : ""} as <strong style={{ color: T.text0 }}>{modes.find(m => m.id === mode)?.label}</strong> grouped by <strong style={{ color: T.text0 }}>{groups.find(g => g.id === groupBy)?.label.toLowerCase()}</strong>.
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "16px 24px", borderTop: `1px solid ${T.border1}` }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 500, color: T.text2, background: T.bg3, border: `1px solid ${T.border1}`, cursor: "pointer" }}>Cancel</button>
          <button onClick={handleExport} disabled={exporting}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, color: "white", background: done ? T.green : T.accent, border: "none", cursor: "pointer" }}>
            <Download size={16} /> {done ? "Downloaded!" : exporting ? "Exporting..." : "Export .xlsx"}
          </button>
        </div>
      </div>
    </div>
  );
}
