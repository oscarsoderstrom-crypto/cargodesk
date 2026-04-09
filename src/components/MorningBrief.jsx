// MorningBrief.jsx — Morning to-do modal, shown once per day on app open
// Props: shipments, quotes, isDark, onClose, onNavigate(shipmentId)

import { X, CheckSquare, AlertTriangle, Clock, DollarSign, FileText, Anchor, TrendingDown, Ship, Calendar } from 'lucide-react';
import { computeBriefItems, computeBriefSummary, markBriefShown } from '../utils/dailyBrief';

const DARK = { bg0:"#0A0E17", bg1:"#0F1421", bg2:"#161C2E", bg3:"#1C2438", bg4:"#232D45", border0:"#1A2236", border1:"#243049", border2:"#2E3D5C", text0:"#F1F5F9", text1:"#CBD5E1", text2:"#8494B0", text3:"#4F5E78", accent:"#3B82F6", accentGlow:"rgba(59,130,246,0.12)", green:"#10B981", greenBg:"rgba(16,185,129,0.12)", greenBorder:"rgba(16,185,129,0.25)", amber:"#F59E0B", amberBg:"rgba(245,158,11,0.12)", amberBorder:"rgba(245,158,11,0.25)", red:"#EF4444", redBg:"rgba(239,68,68,0.10)", redBorder:"rgba(239,68,68,0.25)", purple:"#A78BFA", purpleBg:"rgba(167,139,250,0.12)", purpleBorder:"rgba(167,139,250,0.25)", shadow:"rgba(0,0,0,0.3)", shadowHeavy:"rgba(0,0,0,0.5)" };
const LIGHT = { bg0:"#0B1120", bg1:"#F5F6F8", bg2:"#FFFFFF", bg3:"#F9FAFB", bg4:"#F3F4F6", border0:"#E5E7EB", border1:"#E5E7EB", border2:"#D1D5DB", text0:"#0F172A", text1:"#374151", text2:"#6B7280", text3:"#9CA3AF", accent:"#2563EB", accentGlow:"rgba(37,99,235,0.08)", green:"#059669", greenBg:"#D1FAE5", greenBorder:"#6EE7B7", amber:"#D97706", amberBg:"#FEF3C7", amberBorder:"#FDE68A", red:"#DC2626", redBg:"#FEE2E2", redBorder:"#FECACA", purple:"#7C3AED", purpleBg:"#EDE9FE", purpleBorder:"#C4B5FD", shadow:"rgba(0,0,0,0.06)", shadowHeavy:"rgba(0,0,0,0.15)" };

function getT(isDark) { return isDark ? DARK : LIGHT; }

// ─── Category display config ──────────────────────────────────────────────────

function itemStyle(item, T) {
  const byType = {
    overdue: { color: T.red, bg: T.redBg, border: T.redBorder, dot: T.red },
    today:   { color: T.amber, bg: T.amberBg, border: T.amberBorder, dot: T.amber },
    upcoming:{ color: T.accent, bg: T.accentGlow, border: 'rgba(59,130,246,0.2)', dot: T.accent },
    action:  { color: T.purple, bg: T.purpleBg, border: T.purpleBorder, dot: T.purple },
    info:    { color: T.text2, bg: T.bg3, border: T.border1, dot: T.text3 },
  };
  return byType[item.type] || byType.info;
}

function itemIcon(item) {
  const icons = {
    milestone:   CheckSquare,
    eta_passed:  AlertTriangle,
    arrived:     Anchor,
    running_cost: DollarSign,
    billing:     TrendingDown,
    quote_expiry: FileText,
  };
  return icons[item.category] || Clock;
}

function typeLabel(type) {
  return { overdue: 'OVERDUE', today: 'TODAY', upcoming: 'UPCOMING', action: 'ACTION', info: 'INFO' }[type] || type.toUpperCase();
}

// ─── Summary tile ─────────────────────────────────────────────────────────────

function SummaryTile({ label, value, color, bg, border }) {
  return (
    <div style={{ flex: 1, padding: '12px 14px', borderRadius: 10, background: bg, border: `1px solid ${border}`, textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      <div style={{ fontSize: 11, color, opacity: 0.75, marginTop: 2, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

// ─── Brief item row ───────────────────────────────────────────────────────────

function BriefItem({ item, T, onNavigate }) {
  const s = itemStyle(item, T);
  const Icon = itemIcon(item);

  return (
    <div
      onClick={() => item.shipmentId && onNavigate && onNavigate(item.shipmentId)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '10px 12px', borderRadius: 8,
        background: s.bg, border: `1px solid ${s.border}`,
        marginBottom: 6,
        cursor: item.shipmentId ? 'pointer' : 'default',
        transition: 'opacity 0.15s',
      }}
      onMouseEnter={e => { if (item.shipmentId) e.currentTarget.style.opacity = '0.8'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
    >
      <div style={{ marginTop: 1, flexShrink: 0 }}>
        <Icon size={14} color={s.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: s.color }}>{item.title}</span>
          <span style={{
            fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
            color: s.color, background: `${s.color}22`, border: `1px solid ${s.border}`,
            padding: '1px 5px', borderRadius: 3
          }}>{typeLabel(item.type)}</span>
        </div>
        <div style={{ fontSize: 12, color: T.text2, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.detail}
        </div>
      </div>
      {item.date && (
        <div style={{ fontSize: 11, color: T.text3, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>
          {new Date(item.date).toLocaleDateString('fi-FI', { day: 'numeric', month: 'short' })}
        </div>
      )}
    </div>
  );
}

// ─── Group items ──────────────────────────────────────────────────────────────

const GROUP_ORDER = ['overdue', 'today', 'upcoming', 'action', 'info'];
const GROUP_LABELS = { overdue: 'Overdue', today: 'Due Today', upcoming: 'Coming Up (5 days)', action: 'Needs Attention', info: 'Info' };

function groupItems(items) {
  const groups = {};
  for (const item of items) {
    if (!groups[item.type]) groups[item.type] = [];
    groups[item.type].push(item);
  }
  return GROUP_ORDER.filter(g => groups[g]?.length > 0).map(g => ({ type: g, items: groups[g] }));
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MorningBrief({ shipments = [], quotes = [], isDark = true, onClose, onNavigate }) {
  const T = getT(isDark);
  const items = computeBriefItems(shipments, quotes);
  const summary = computeBriefSummary(shipments);
  const groups = groupItems(items);

  const today = new Date().toLocaleDateString('fi-FI', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  function handleClose() {
    markBriefShown();
    onClose?.();
  }

  function handleNavigate(shipmentId) {
    markBriefShown();
    onNavigate?.(shipmentId);
    onClose?.();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Backdrop */}
      <div onClick={handleClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} />

      {/* Modal */}
      <div style={{
        position: 'relative', width: 580, maxHeight: '88vh',
        display: 'flex', flexDirection: 'column',
        background: T.bg2, borderRadius: 16,
        border: `1px solid ${T.border1}`,
        boxShadow: `0 24px 80px ${T.shadowHeavy}`,
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 24px 16px', borderBottom: `1px solid ${T.border1}`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: T.accentGlow, border: `1px solid rgba(59,130,246,0.25)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Calendar size={14} color={T.accent} />
              </div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: T.text0 }}>Morning Brief</h2>
            </div>
            <div style={{ fontSize: 12, color: T.text3, textTransform: 'capitalize' }}>{today}</div>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', color: T.text3, cursor: 'pointer', padding: 4, marginTop: -2 }}>
            <X size={18} />
          </button>
        </div>

        {/* Summary tiles */}
        <div style={{ padding: '14px 24px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <SummaryTile label="Active" value={summary.activeShipments} color={T.accent} bg={T.accentGlow} border="rgba(59,130,246,0.2)" />
            <SummaryTile label="Sailing" value={summary.sailingShipments} color={T.text1} bg={T.bg3} border={T.border1} />
            <SummaryTile label="Arriving (7d)" value={summary.arrivingSoon} color={T.green} bg={T.greenBg} border={T.greenBorder} />
            <SummaryTile label="Overdue Tasks" value={summary.overdueMilestones} color={summary.overdueMilestones > 0 ? T.red : T.text3} bg={summary.overdueMilestones > 0 ? T.redBg : T.bg3} border={summary.overdueMilestones > 0 ? T.redBorder : T.border1} />
            <SummaryTile label="Billing" value={summary.pendingBilling} color={summary.pendingBilling > 0 ? T.amber : T.text3} bg={summary.pendingBilling > 0 ? T.amberBg : T.bg3} border={summary.pendingBilling > 0 ? T.amberBorder : T.border1} />
          </div>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 24px 8px' }}>
          {groups.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '32px 0',
              color: T.text3, fontSize: 14,
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
              All clear — no urgent tasks today.
            </div>
          )}
          {groups.map(group => (
            <div key={group.type} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: T.text3, textTransform: 'uppercase', marginBottom: 6 }}>
                {GROUP_LABELS[group.type]} ({group.items.length})
              </div>
              {group.items.map(item => (
                <BriefItem key={item.id} item={item} T={T} onNavigate={handleNavigate} />
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 24px', borderTop: `1px solid ${T.border1}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, color: T.text3 }}>Click any item to open the shipment</span>
          <button
            onClick={handleClose}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              color: 'white', background: T.accent, border: 'none', cursor: 'pointer',
            }}
          >
            Start Day
          </button>
        </div>
      </div>
    </div>
  );
}
