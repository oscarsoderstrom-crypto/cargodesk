// MonthlyReportModal.jsx — End-of-month Financial and CO2e reports
// Props: shipments, projects, rates, isDark, onClose

import { useState, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Printer, Leaf, DollarSign, Ship, Plane, Truck } from 'lucide-react';
import { computeFinancialReport, computeCO2eReport, availableMonths, monthLabel, exportMonthlyExcel } from '../utils/monthlyReports';

const DARK = { bg0:"#0A0E17",bg1:"#0F1421",bg2:"#161C2E",bg3:"#1C2438",bg4:"#232D45",border0:"#1A2236",border1:"#243049",border2:"#2E3D5C",text0:"#F1F5F9",text1:"#CBD5E1",text2:"#8494B0",text3:"#4F5E78",accent:"#3B82F6",accentGlow:"rgba(59,130,246,0.12)",green:"#10B981",greenBg:"rgba(16,185,129,0.12)",greenBorder:"rgba(16,185,129,0.25)",amber:"#F59E0B",amberBg:"rgba(245,158,11,0.12)",amberBorder:"rgba(245,158,11,0.25)",red:"#EF4444",redBg:"rgba(239,68,68,0.10)",redBorder:"rgba(239,68,68,0.25)",purple:"#A78BFA",purpleBg:"rgba(167,139,250,0.12)",purpleBorder:"rgba(167,139,250,0.25)",shadow:"rgba(0,0,0,0.3)",shadowHeavy:"rgba(0,0,0,0.5)" };
const LIGHT = { bg0:"#0B1120",bg1:"#F5F6F8",bg2:"#FFFFFF",bg3:"#F9FAFB",bg4:"#F3F4F6",border0:"#E5E7EB",border1:"#E5E7EB",border2:"#D1D5DB",text0:"#0F172A",text1:"#374151",text2:"#6B7280",text3:"#9CA3AF",accent:"#2563EB",accentGlow:"rgba(37,99,235,0.08)",green:"#059669",greenBg:"#D1FAE5",greenBorder:"#6EE7B7",amber:"#D97706",amberBg:"#FEF3C7",amberBorder:"#FDE68A",red:"#DC2626",redBg:"#FEE2E2",redBorder:"#FECACA",purple:"#7C3AED",purpleBg:"#EDE9FE",purpleBorder:"#C4B5FD",shadow:"rgba(0,0,0,0.06)",shadowHeavy:"rgba(0,0,0,0.15)" };
function getT(isDark) { return isDark ? DARK : LIGHT; }

const fmt = n => new Intl.NumberFormat('fi-FI', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const fmtKg = kg => kg >= 1000 ? `${(kg / 1000).toFixed(2)} t` : `${Math.round(kg)} kg`;
const MODE_ICON = { ocean: Ship, air: Plane, truck: Truck };
const MODE_COLOR = T => ({ ocean: T.accent, air: T.purple, truck: T.amber });

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color, bg, border }) {
  return (
    <div style={{ flex: 1, padding: '14px 16px', borderRadius: 10, background: bg, border: `1px solid ${border}` }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color, opacity: 0.8, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
    </div>
  );
}

// ─── Financial Tab ────────────────────────────────────────────────────────────

function FinancialTab({ data, T }) {
  if (!data || data.shipmentCount === 0) {
    return <div style={{ padding: 48, textAlign: 'center', color: T.text3 }}>No shipments with ETD in this month.</div>;
  }
  const mono = "'JetBrains Mono', monospace";
  const { rows, grandTotal } = data;

  return (
    <div>
      {/* Totals */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <StatCard label="Total Quoted" value={fmt(grandTotal.quoted)} color={T.accent} bg={T.accentGlow} border="rgba(59,130,246,0.2)" />
        <StatCard label="Total Costs" value={fmt(grandTotal.cost)} color={T.text1} bg={T.bg3} border={T.border1} />
        <StatCard label="Gross Margin" value={fmt(grandTotal.margin)} color={grandTotal.margin >= 0 ? T.green : T.red} bg={grandTotal.margin >= 0 ? T.greenBg : T.redBg} border={grandTotal.margin >= 0 ? T.greenBorder : T.redBorder} />
        <StatCard label="Margin %" value={`${grandTotal.marginPct.toFixed(1)}%`} color={grandTotal.marginPct >= 0 ? T.green : T.red} bg={grandTotal.marginPct >= 0 ? T.greenBg : T.redBg} border={grandTotal.marginPct >= 0 ? T.greenBorder : T.redBorder} />
        <StatCard label="Shipments" value={data.shipmentCount} color={T.text2} bg={T.bg3} border={T.border1} />
      </div>

      {rows.map(row => (
        <div key={row.projectId} style={{ marginBottom: 20 }}>
          {/* Project header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingLeft: 2 }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: T.text0 }}>{row.projectName}</span>
              {row.customer !== '—' && <span style={{ fontSize: 12, color: T.text2, marginLeft: 8 }}>{row.customer}</span>}
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: row.totals.margin >= 0 ? T.green : T.red, fontFamily: mono }}>
              {fmt(row.totals.margin)} ({row.totals.marginPct.toFixed(1)}%)
            </span>
          </div>

          {/* Table */}
          <div style={{ borderRadius: 10, border: `1px solid ${T.border1}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: T.bg3 }}>
                  {['Reference', 'Route', 'Mode', 'Status', 'Quoted', 'Costs', 'Margin'].map(h => (
                    <th key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', padding: '9px 14px', color: T.text3, borderBottom: `1px solid ${T.border1}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {row.shipments.map((s, i) => (
                  <tr key={s.id} style={{ borderBottom: i < row.shipments.length - 1 ? `1px solid ${T.border0}` : 'none', background: T.bg2 }}
                    onMouseEnter={e => e.currentTarget.style.background = T.bg3}
                    onMouseLeave={e => e.currentTarget.style.background = T.bg2}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text0, fontFamily: mono }}>{s.ref || '—'}</div>
                      {s.customerRef && <div style={{ fontSize: 11, color: T.text3 }}>{s.customerRef}</div>}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: T.text1 }}>{s.origin?.split(',')[0]} → {s.destination?.split(',')[0]}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {(() => { const I = MODE_ICON[s.mode]; return I ? <I size={13} color={MODE_COLOR(T)[s.mode]} /> : null; })()}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 11, fontWeight: 600, color: T.text2, textTransform: 'uppercase' }}>{s.status}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontFamily: mono, color: T.text1 }}>{fmt(s.quoted)}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontFamily: mono, color: T.text1 }}>{fmt(s.cost)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: mono, color: s.margin >= 0 ? T.green : T.red }}>{fmt(s.margin)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: T.bg4, borderTop: `1px solid ${T.border1}` }}>
                  <td colSpan={4} style={{ padding: '9px 14px', fontSize: 11, fontWeight: 700, color: T.text2, textTransform: 'uppercase' }}>Project Total</td>
                  <td style={{ padding: '9px 14px', fontSize: 13, fontWeight: 700, fontFamily: mono, color: T.accent }}>{fmt(row.totals.quoted)}</td>
                  <td style={{ padding: '9px 14px', fontSize: 13, fontWeight: 700, fontFamily: mono, color: T.text1 }}>{fmt(row.totals.cost)}</td>
                  <td style={{ padding: '9px 14px', fontSize: 13, fontWeight: 700, fontFamily: mono, color: row.totals.margin >= 0 ? T.green : T.red }}>{fmt(row.totals.margin)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── CO2e Tab ─────────────────────────────────────────────────────────────────

function CO2eTab({ data, T }) {
  if (!data || data.shipmentCount === 0) {
    return <div style={{ padding: 48, textAlign: 'center', color: T.text3 }}>No shipments with CO2e data in this month.</div>;
  }
  const modeColors = MODE_COLOR(T);

  return (
    <div>
      {/* Total */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <StatCard label="Total CO2e" value={fmtKg(data.totalKg)} color={T.green} bg={T.greenBg} border={T.greenBorder} />
        <StatCard label="Shipments" value={data.shipmentCount} color={T.text2} bg={T.bg3} border={T.border1} />
        {data.byMode.map(m => (
          <StatCard key={m.mode} label={m.label} value={fmtKg(m.kg)} color={modeColors[m.mode] || T.text2} bg={T.bg3} border={T.border1} />
        ))}
      </div>

      {/* By project breakdown */}
      {data.byProject.length > 1 && (
        <div style={{ marginBottom: 20, padding: 14, borderRadius: 10, background: T.bg3, border: `1px solid ${T.border1}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: T.text3, marginBottom: 10 }}>By Project</div>
          {data.byProject.map(p => (
            <div key={p.projectName} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ fontSize: 13, color: T.text1, width: 160, flexShrink: 0 }}>{p.projectName}</div>
              <div style={{ flex: 1, height: 6, background: T.bg4, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${p.pct}%`, background: T.green, borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 12, color: T.green, fontFamily: "'JetBrains Mono', monospace", width: 80, textAlign: 'right' }}>{fmtKg(p.kg)}</div>
              <div style={{ fontSize: 11, color: T.text3, width: 36, textAlign: 'right' }}>{p.pct.toFixed(0)}%</div>
            </div>
          ))}
        </div>
      )}

      {/* By mode */}
      {data.byMode.map(modeGroup => (
        <div key={modeGroup.mode} style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            {(() => { const I = MODE_ICON[modeGroup.mode]; return I ? <I size={13} color={modeColors[modeGroup.mode]} /> : null; })()}
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text0 }}>{modeGroup.label}</span>
            <span style={{ fontSize: 12, color: T.text3 }}>— {fmtKg(modeGroup.kg)} total</span>
          </div>
          <div style={{ borderRadius: 10, border: `1px solid ${T.border1}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: T.bg3 }}>
                  {['Reference', 'Route', 'Carrier', 'ETD', 'CO2e', 'Distance'].map(h => (
                    <th key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', padding: '9px 14px', color: T.text3, borderBottom: `1px solid ${T.border1}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modeGroup.shipments.map((s, i) => (
                  <tr key={s.id} style={{ borderBottom: i < modeGroup.shipments.length - 1 ? `1px solid ${T.border0}` : 'none', background: T.bg2 }}
                    onMouseEnter={e => e.currentTarget.style.background = T.bg3}
                    onMouseLeave={e => e.currentTarget.style.background = T.bg2}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text0, fontFamily: "'JetBrains Mono', monospace" }}>{s.ref || '—'}</div>
                      {s.customerRef && <div style={{ fontSize: 11, color: T.text3 }}>{s.customerRef}</div>}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: T.text1 }}>{s.origin?.split(',')[0]} → {s.destination?.split(',')[0]}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: T.text2 }}>{s.carrier}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: T.text3, fontFamily: "'JetBrains Mono', monospace" }}>{s.etd}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: T.green, fontFamily: "'JetBrains Mono', monospace" }}>{fmtKg(s.co2eKg)}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: T.text3 }}>{s.distanceKm ? `${Math.round(s.distanceKm).toLocaleString('fi-FI')} km` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MonthlyReportModal({ shipments = [], projects = [], rates, isDark = true, onClose }) {
  const T = getT(isDark);

  // Month navigation
  const months = useMemo(() => {
    const avail = availableMonths(shipments);
    // Also include current month if not present
    const cur = new Date().toISOString().slice(0, 7);
    if (!avail.includes(cur)) avail.unshift(cur);
    return avail;
  }, [shipments]);

  const [monthIdx, setMonthIdx] = useState(0); // 0 = most recent
  const [activeTab, setActiveTab] = useState('financial');
  const [exporting, setExporting] = useState(false);

  const selectedKey = months[monthIdx] || new Date().toISOString().slice(0, 7);
  const [yearStr, monthStr] = selectedKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const financialData = useMemo(() => computeFinancialReport(shipments, projects, year, month, rates), [shipments, projects, year, month, rates]);
  const co2eData = useMemo(() => computeCO2eReport(shipments, projects, year, month), [shipments, projects, year, month]);

  async function handleExport() {
    setExporting(true);
    try { await exportMonthlyExcel(financialData, co2eData); }
    finally { setExporting(false); }
  }

  const label = monthLabel(year, month);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', width: 900, maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: T.bg2, borderRadius: 16, border: `1px solid ${T.border1}`, boxShadow: `0 24px 80px ${T.shadowHeavy}` }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${T.border1}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: T.text0 }}>Monthly Report</h2>
            {/* Month navigator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: T.bg3, borderRadius: 8, padding: '3px 4px', border: `1px solid ${T.border1}` }}>
              <button onClick={() => setMonthIdx(i => Math.min(i + 1, months.length - 1))} disabled={monthIdx >= months.length - 1}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: monthIdx >= months.length - 1 ? T.text3 : T.text1, padding: '3px 6px', borderRadius: 5, display: 'flex', alignItems: 'center' }}>
                <ChevronLeft size={15} />
              </button>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.text0, minWidth: 120, textAlign: 'center', textTransform: 'capitalize' }}>{label}</span>
              <button onClick={() => setMonthIdx(i => Math.max(i - 1, 0))} disabled={monthIdx <= 0}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: monthIdx <= 0 ? T.text3 : T.text1, padding: '3px 6px', borderRadius: 5, display: 'flex', alignItems: 'center' }}>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={handleExport} disabled={exporting}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, color: T.green, background: T.greenBg, border: `1px solid ${T.greenBorder}`, cursor: 'pointer' }}>
              <Download size={13} /> {exporting ? 'Exporting…' : 'Export Excel'}
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.text3, cursor: 'pointer', padding: 4 }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${T.border1}`, flexShrink: 0 }}>
          {[{ id: 'financial', label: 'Financial', icon: DollarSign }, { id: 'co2e', label: 'CO2 Emissions', icon: Leaf }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? T.accent : 'transparent'}`, color: activeTab === tab.id ? T.accent : T.text2, transition: 'color 0.15s' }}>
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {activeTab === 'financial' && <FinancialTab data={financialData} T={T} />}
          {activeTab === 'co2e' && <CO2eTab data={co2eData} T={T} />}
        </div>
      </div>
    </div>
  );
}
