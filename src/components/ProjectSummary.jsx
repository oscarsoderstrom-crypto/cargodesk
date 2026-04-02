import { useState } from "react";
import { ChevronLeft, Ship, Plane, Truck, Package, FolderOpen, DollarSign, BarChart3, CheckCircle2, Clock } from "lucide-react";

const MODE_ICON = { ocean: Ship, air: Plane, truck: Truck };

export default function ProjectSummary({ T, project, shipments, rates, onBack, onSelectShipment }) {
  const toEUR = (a, c) => a / ((rates || {})[c] || 1);
  const formatEUR = v => new Intl.NumberFormat("fi-FI", { style: "currency", currency: "EUR" }).format(v);
  const fmtDate = d => { if (!d) return "—"; return new Date(d).toLocaleDateString("fi-FI", { day: "numeric", month: "short", year: "numeric" }); };
  const mono = "'JetBrains Mono',monospace";

  const statusCounts = {};
  shipments.forEach(s => { statusCounts[s.status] = (statusCounts[s.status] || 0) + 1; });
  const totalDone = shipments.reduce((sum, s) => sum + (s.milestones || []).filter(m => m.done).length, 0);
  const totalMilestones = shipments.reduce((sum, s) => sum + (s.milestones || []).length, 0);
  const progressPct = totalMilestones > 0 ? (totalDone / totalMilestones * 100) : 0;

  const financials = shipments.reduce((a, s) => {
    const cost = (s.costs?.items || []).reduce((sum, c) => sum + toEUR(c.amount, c.currency), 0) +
      (s.costs?.running || []).reduce((sum, r) => { const d = r.status === "running" ? Math.max(1, Math.ceil((new Date() - new Date(r.startDate)) / 86400000)) : (r.totalDays || 0); return sum + toEUR(r.dailyRate * d, r.currency); }, 0);
    return { quoted: a.quoted + (s.costs?.quoted || 0), cost: a.cost + cost };
  }, { quoted: 0, cost: 0 });
  const margin = financials.quoted - financials.cost;

  const statusColors = { planned: T.text2, booked: T.amber, in_transit: T.accent, arrived: T.purple, delivered: T.green, completed: T.text3 };
  const statusLabels = { planned: "Planned", booked: "Booked", in_transit: "In Transit", arrived: "Arrived", delivered: "Delivered", completed: "Completed" };

  return (
    <div style={{ height: "100%", overflow: "auto", background: T.bg1 }}>
      {/* Header */}
      <div style={{ padding: 24, borderBottom: `1px solid ${T.border1}`, background: `linear-gradient(180deg,${T.bg2} 0%,${T.bg1} 100%)` }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14, marginBottom: 16, padding: "4px 8px", borderRadius: 4, color: T.text2, background: "none", border: "none", cursor: "pointer" }}>
          <ChevronLeft size={16} /> Back to Dashboard
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: T.accentGlow, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid rgba(59,130,246,0.2)` }}>
            <FolderOpen size={22} color={T.accent} />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: T.text0, margin: 0 }}>{project.name}</h1>
            <div style={{ fontSize: 14, color: T.text2, marginTop: 2 }}>{project.customer} • {shipments.length} shipment{shipments.length !== 1 ? "s" : ""}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: 24 }}>
        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
          <div style={{ padding: 16, borderRadius: 10, background: T.bg2, border: `1px solid ${T.border1}` }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: T.text2, marginBottom: 4 }}>Shipments</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: T.text0, fontFamily: mono }}>{shipments.length}</div>
          </div>
          <div style={{ padding: 16, borderRadius: 10, background: T.bg2, border: `1px solid ${T.border1}` }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: T.text2, marginBottom: 4 }}>Total Quoted</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.accent, fontFamily: mono }}>{formatEUR(financials.quoted)}</div>
          </div>
          <div style={{ padding: 16, borderRadius: 10, background: T.bg2, border: `1px solid ${T.border1}` }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: T.text2, marginBottom: 4 }}>Total Costs</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.text1, fontFamily: mono }}>{formatEUR(financials.cost)}</div>
          </div>
          <div style={{ padding: 16, borderRadius: 10, background: T.bg2, border: `1px solid ${margin >= 0 ? T.border1 : T.redBorder}` }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: T.text2, marginBottom: 4 }}>Margin</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: margin >= 0 ? T.green : T.red, fontFamily: mono }}>{formatEUR(margin)}</div>
            <div style={{ fontSize: 11, color: margin >= 0 ? T.green : T.red }}>{financials.quoted > 0 ? (margin / financials.quoted * 100).toFixed(1) + "%" : "—"}</div>
          </div>
        </div>

        {/* Overall progress */}
        <div style={{ padding: 16, borderRadius: 10, background: T.bg2, border: `1px solid ${T.border1}`, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text2 }}>Overall Progress</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text0 }}>{totalDone}/{totalMilestones} milestones ({Math.round(progressPct)}%)</span>
          </div>
          <div style={{ height: 6, background: T.bg4, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progressPct}%`, background: progressPct === 100 ? T.green : T.accent, borderRadius: 3, transition: "width 0.3s" }} />
          </div>
          {/* Status breakdown */}
          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColors[status] || T.text3 }} />
                <span style={{ fontSize: 12, color: T.text2 }}>{count} {statusLabels[status] || status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Shipment list */}
        <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: T.text2, marginBottom: 12 }}>Shipments</h3>
        <div style={{ borderRadius: 10, border: `1px solid ${T.border1}`, overflow: "hidden" }}>
          {shipments.map((s, i) => {
            const Icon = MODE_ICON[s.mode] || Package;
            const modeColor = { ocean: T.modeOcean, air: T.modeAir, truck: T.modeTruck }[s.mode] || T.text2;
            const cost = (s.costs?.items || []).reduce((sum, c) => sum + toEUR(c.amount, c.currency), 0);
            const sMargin = (s.costs?.quoted || 0) - cost;
            const done = (s.milestones || []).filter(m => m.done).length;
            const total = (s.milestones || []).length;

            return (
              <div key={s.id} onClick={() => onSelectShipment(s.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer",
                  borderBottom: i < shipments.length - 1 ? `1px solid ${T.border0}` : "none", background: T.bg2 }}
                onMouseEnter={e => e.currentTarget.style.background = T.bg3}
                onMouseLeave={e => e.currentTarget.style.background = T.bg2}>
                <Icon size={16} color={modeColor} />
                <div style={{ width: 120, flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: mono, color: T.text0 }}>{s.ref || <span style={{ color: T.text3, fontStyle: "italic" }}>Pending</span>}</div>
                  {s.customerRef && <div style={{ fontSize: 11, color: T.text3 }}>{s.customerRef}</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: T.text1 }}>{s.origin} → {s.destination}</div>
                  <div style={{ fontSize: 11, color: T.text3 }}>{s.carrier}</div>
                </div>
                <div style={{ width: 70, textAlign: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 6px", borderRadius: 3, background: T.bg4, color: statusColors[s.status] || T.text2, textTransform: "uppercase" }}>
                    {statusLabels[s.status] || s.status}
                  </span>
                </div>
                <div style={{ width: 80, textAlign: "right" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, fontFamily: mono, color: sMargin >= 0 ? T.green : T.red }}>{formatEUR(sMargin)}</div>
                </div>
                <div style={{ width: 70 }}>
                  <div style={{ height: 4, background: T.bg4, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${total > 0 ? (done / total * 100) : 0}%`, background: done === total && total > 0 ? T.green : T.accent, borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 10, color: T.text3, textAlign: "right", marginTop: 2 }}>{done}/{total}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
