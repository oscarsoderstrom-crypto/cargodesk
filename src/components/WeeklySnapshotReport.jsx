// WeeklySnapshotReport.jsx — Printable weekly situation report
// Props: shipments, projects, rates, isDark, onClose, onNavigate(shipmentId)

import { useState, useMemo } from 'react';
import { X, Printer, Ship, Plane, Truck, Package, Anchor, AlertTriangle, CheckCircle2, DollarSign, Clock, TrendingDown } from 'lucide-react';
import { computeWeeklySnapshot } from '../utils/weeklySnapshot';

const DARK = { bg0:"#0A0E17",bg1:"#0F1421",bg2:"#161C2E",bg3:"#1C2438",bg4:"#232D45",border0:"#1A2236",border1:"#243049",border2:"#2E3D5C",text0:"#F1F5F9",text1:"#CBD5E1",text2:"#8494B0",text3:"#4F5E78",accent:"#3B82F6",accentGlow:"rgba(59,130,246,0.12)",green:"#10B981",greenBg:"rgba(16,185,129,0.12)",greenBorder:"rgba(16,185,129,0.25)",amber:"#F59E0B",amberBg:"rgba(245,158,11,0.12)",amberBorder:"rgba(245,158,11,0.25)",red:"#EF4444",redBg:"rgba(239,68,68,0.10)",redBorder:"rgba(239,68,68,0.25)",purple:"#A78BFA",purpleBg:"rgba(167,139,250,0.12)",purpleBorder:"rgba(167,139,250,0.25)",shadow:"rgba(0,0,0,0.3)",shadowHeavy:"rgba(0,0,0,0.5)" };
const LIGHT = { bg0:"#0B1120",bg1:"#F5F6F8",bg2:"#FFFFFF",bg3:"#F9FAFB",bg4:"#F3F4F6",border0:"#E5E7EB",border1:"#E5E7EB",border2:"#D1D5DB",text0:"#0F172A",text1:"#374151",text2:"#6B7280",text3:"#9CA3AF",accent:"#2563EB",accentGlow:"rgba(37,99,235,0.08)",green:"#059669",greenBg:"#D1FAE5",greenBorder:"#6EE7B7",amber:"#D97706",amberBg:"#FEF3C7",amberBorder:"#FDE68A",red:"#DC2626",redBg:"#FEE2E2",redBorder:"#FECACA",purple:"#7C3AED",purpleBg:"#EDE9FE",purpleBorder:"#C4B5FD",shadow:"rgba(0,0,0,0.06)",shadowHeavy:"rgba(0,0,0,0.15)" };
function getT(isDark) { return isDark ? DARK : LIGHT; }

const fmtDate = d => d ? new Date(d).toLocaleDateString('fi-FI', { day: 'numeric', month: 'short' }) : '—';
const fmt = n => new Intl.NumberFormat('fi-FI', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const MODE_ICON = { ocean: Ship, air: Plane, truck: Truck };
const MODE_COLORS = T => ({ ocean: T.accent, air: T.purple, truck: T.amber });

// ─── Shipment card used throughout sections ───────────────────────────────────

function ShipmentCard({ s, T, onNavigate, showETA = true, showETD = false, accentColor, accentBg, accentBorder, badge }) {
  const I = MODE_ICON[s.mode] || Package;
  const modeClr = MODE_COLORS(T)[s.mode] || T.text2;
  const nextMs = s.milestones.find(m => !m.done && m.date);

  return (
    <div
      onClick={() => onNavigate?.(s.id)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
        borderRadius: 9, background: accentBg || T.bg3, border: `1px solid ${accentBorder || T.border1}`,
        marginBottom: 6, cursor: onNavigate ? 'pointer' : 'default', transition: 'opacity 0.15s',
      }}
      onMouseEnter={e => { if (onNavigate) e.currentTarget.style.opacity = '0.8'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
    >
      {/* Mode icon */}
      <div style={{ width: 30, height: 30, borderRadius: 7, background: T.bg4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
        <I size={15} color={modeClr} />
      </div>

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text0, fontFamily: "'JetBrains Mono', monospace" }}>{s.ref || 'Pending'}</span>
          {s.customerRef && <span style={{ fontSize: 12, color: T.text3 }}>{s.customerRef}</span>}
          {s.projectName && <span style={{ fontSize: 10, fontWeight: 700, color: accentColor || T.accent, background: `${accentColor || T.accent}18`, padding: '1px 6px', borderRadius: 3 }}>{s.projectName}</span>}
          {badge}
        </div>
        <div style={{ fontSize: 13, color: T.text1, marginBottom: 3 }}>
          {s.origin?.split(',')[0]} → {s.destination?.split(',')[0]}
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {s.carrier && <span style={{ fontSize: 11, color: T.text3 }}>{s.carrier}</span>}
          {s.vessel && s.vessel !== 'TBD' && s.vessel !== '—' && <span style={{ fontSize: 11, color: T.text3 }}>{s.vessel}</span>}
          {s.containerType && <span style={{ fontSize: 11, color: T.text3 }}>{s.containerType}</span>}
        </div>
      </div>

      {/* Dates */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {showETD && s.etd && (
          <div style={{ fontSize: 11, color: T.text2, marginBottom: 2 }}>
            <span style={{ color: T.text3 }}>ETD</span> {fmtDate(s.etd)}
          </div>
        )}
        {showETA && s.eta && (
          <div style={{ fontSize: 12, fontWeight: 600, color: accentColor || T.text1 }}>
            <span style={{ fontSize: 11, color: T.text3, fontWeight: 400 }}>ETA </span>{fmtDate(s.eta)}
          </div>
        )}
        {s.hasRunningCosts && (
          <div style={{ fontSize: 10, fontWeight: 700, color: T.red, marginTop: 3 }}>COST RUNNING</div>
        )}
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ title, count, icon: Icon, color, bg, border, children, T, emptyText }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: collapsed ? 0 : 12, cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ width: 26, height: 26, borderRadius: 6, background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={13} color={color} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.text0 }}>{title}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color, background: bg, border: `1px solid ${border}`, padding: '1px 7px', borderRadius: 10 }}>{count}</span>
        <span style={{ fontSize: 11, color: T.text3, marginLeft: 'auto' }}>{collapsed ? '▸' : '▾'}</span>
      </div>
      {!collapsed && (
        count === 0
          ? <div style={{ fontSize: 13, color: T.text3, padding: '8px 4px' }}>{emptyText}</div>
          : children
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function WeeklySnapshotReport({ shipments = [], projects = [], rates, isDark = true, onClose, onNavigate }) {
  const T = getT(isDark);

  const snapshot = useMemo(() => computeWeeklySnapshot(shipments, projects, rates), [shipments, projects, rates]);

  const reportDate = new Date().toLocaleDateString('fi-FI', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const weekStart = new Date(Date.now() - 7 * 86400000).toLocaleDateString('fi-FI', { day: 'numeric', month: 'short' });
  const weekEnd = new Date().toLocaleDateString('fi-FI', { day: 'numeric', month: 'short' });

  function handleNavigate(id) {
    onNavigate?.(id);
    onClose?.();
  }

  function handlePrint() {
    window.print();
  }

  const modeClr = MODE_COLORS(T);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />

      <div style={{ position: 'relative', width: 800, maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: T.bg2, borderRadius: 16, border: `1px solid ${T.border1}`, boxShadow: `0 24px 80px ${T.shadowHeavy}` }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${T.border1}`, flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: T.text0 }}>Weekly Situation Report</h2>
            <div style={{ fontSize: 12, color: T.text3, marginTop: 2, textTransform: 'capitalize' }}>{reportDate} · {weekStart}–{weekEnd}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handlePrint}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, color: T.accent, background: T.accentGlow, border: `1px solid rgba(59,130,246,0.2)`, cursor: 'pointer' }}>
              <Printer size={13} /> Print / Save PDF
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.text3, cursor: 'pointer', padding: 4 }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Summary row */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 24px', borderBottom: `1px solid ${T.border1}`, flexShrink: 0 }}>
          {[
            { label: 'Departed (7d)', val: snapshot.departed.length, color: T.accent, bg: T.accentGlow, border: 'rgba(59,130,246,0.2)' },
            { label: 'Sailing', val: snapshot.sailing.length, color: modeClr.ocean, bg: T.accentGlow, border: 'rgba(59,130,246,0.2)' },
            { label: 'Arriving (7d)', val: snapshot.arrivingSoon.length, color: T.green, bg: T.greenBg, border: T.greenBorder },
            { label: 'Need Status Update', val: snapshot.arrived.length, color: T.amber, bg: T.amberBg, border: T.amberBorder },
            { label: 'Billing Pending', val: snapshot.billingPending.length, color: T.purple, bg: T.purpleBg, border: T.purpleBorder },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, padding: '10px 12px', borderRadius: 9, background: s.bg, border: `1px solid ${s.border}`, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.val}</div>
              <div style={{ fontSize: 10, color: s.color, opacity: 0.75, marginTop: 1, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          <Section title="Departed This Week" count={snapshot.departed.length} icon={Ship} color={T.accent} bg={T.accentGlow} border="rgba(59,130,246,0.2)" T={T} emptyText="No departures in the past 7 days.">
            {snapshot.departed.map(s => (
              <ShipmentCard key={s.id} s={s} T={T} onNavigate={handleNavigate}
                showETD showETA accentColor={T.accent} accentBg={T.accentGlow} accentBorder="rgba(59,130,246,0.15)" />
            ))}
          </Section>

          <Section title="Currently Sailing" count={snapshot.sailing.length} icon={Anchor} color={T.accent} bg={T.accentGlow} border="rgba(59,130,246,0.2)" T={T} emptyText="No shipments currently in transit.">
            {snapshot.sailing.map(s => (
              <ShipmentCard key={s.id} s={s} T={T} onNavigate={handleNavigate}
                showETA accentColor={T.accent}
                badge={snapshot.arrivingSoon.find(a => a.id === s.id) && (
                  <span style={{ fontSize: 9, fontWeight: 800, color: T.green, background: T.greenBg, border: `1px solid ${T.greenBorder}`, padding: '1px 5px', borderRadius: 3 }}>ARRIVING SOON</span>
                )} />
            ))}
          </Section>

          <Section title="Arriving This Week" count={snapshot.arrivingSoon.length} icon={CheckCircle2} color={T.green} bg={T.greenBg} border={T.greenBorder} T={T} emptyText="No arrivals expected in the next 7 days.">
            {snapshot.arrivingSoon.map(s => (
              <ShipmentCard key={s.id} s={s} T={T} onNavigate={handleNavigate}
                showETA accentColor={T.green} accentBg={T.greenBg} accentBorder={T.greenBorder} />
            ))}
          </Section>

          <Section title="Need Status Update" count={snapshot.arrived.length} icon={AlertTriangle} color={T.amber} bg={T.amberBg} border={T.amberBorder} T={T} emptyText="No shipments waiting for status update.">
            <div style={{ fontSize: 12, color: T.text3, marginBottom: 8, paddingLeft: 2 }}>Arrived / ETA passed — confirm status and update to Arrived or Delivered</div>
            {snapshot.arrived.map(s => (
              <ShipmentCard key={s.id} s={s} T={T} onNavigate={handleNavigate}
                showETA accentColor={T.amber} accentBg={T.amberBg} accentBorder={T.amberBorder} />
            ))}
          </Section>

          <Section title="Billing Pending" count={snapshot.billingPending.length} icon={DollarSign} color={T.purple} bg={T.purpleBg} border={T.purpleBorder} T={T} emptyText="No delivered shipments awaiting billing.">
            <div style={{ fontSize: 12, color: T.text3, marginBottom: 8, paddingLeft: 2 }}>Delivered shipments with cost data — review and confirm billing complete</div>
            {snapshot.billingPending.map(s => (
              <ShipmentCard key={s.id} s={s} T={T} onNavigate={handleNavigate}
                showETA={false} accentColor={T.purple} accentBg={T.purpleBg} accentBorder={T.purpleBorder}
                badge={
                  <span style={{ fontSize: 11, color: T.purple, fontFamily: "'JetBrains Mono', monospace" }}>
                    Quoted {fmt(s.quoted)} · Margin {fmt(s.margin)}
                  </span>
                } />
            ))}
          </Section>

        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: `1px solid ${T.border1}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: T.text3 }}>Click any shipment to open it</span>
          <button onClick={onClose}
            style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'white', background: T.accent, border: 'none', cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
