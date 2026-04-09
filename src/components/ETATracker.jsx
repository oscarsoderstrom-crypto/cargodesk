// ETATracker.jsx — Displays original vs current ETD/ETA with change alerts
// Use in ShipmentDetail overview tab

import React from 'react';
import { AlertTriangle, Clock, ArrowRight } from 'lucide-react';

export default function ETATracker({ shipment, isDark }) {
  if (!shipment) return null;

  const text = isDark ? '#e2e2e8' : '#1a1a2e';
  const textMuted = isDark ? '#8888a0' : '#6b7280';
  const bgWarn = isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.08)';
  const bgDanger = isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)';

  const hasOrigETD = shipment.originalETD && shipment.etd && shipment.originalETD !== shipment.etd;
  const hasOrigETA = shipment.originalETA && shipment.eta && shipment.originalETA !== shipment.eta;

  if (!hasOrigETD && !hasOrigETA) return null;

  function diffDays(orig, curr) {
    if (!orig || !curr) return 0;
    return Math.round((new Date(curr) - new Date(orig)) / (1000 * 60 * 60 * 24));
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }

  const etdDiff = hasOrigETD ? diffDays(shipment.originalETD, shipment.etd) : 0;
  const etaDiff = hasOrigETA ? diffDays(shipment.originalETA, shipment.eta) : 0;
  const maxDiff = Math.max(Math.abs(etdDiff), Math.abs(etaDiff));
  const severity = maxDiff >= 14 ? 'danger' : maxDiff >= 7 ? 'warn' : 'info';
  const badgeColor = severity === 'danger' ? '#ef4444' : severity === 'warn' ? '#f59e0b' : '#3b82f6';
  const bg = severity === 'danger' ? bgDanger : bgWarn;

  return (
    <div style={{
      padding: '10px 12px', borderRadius: 8, background: bg,
      border: `1px solid ${badgeColor}22`, marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 12, fontWeight: 600, color: badgeColor }}>
        <AlertTriangle size={14} />
        Schedule Changed
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {hasOrigETD && (
          <DateChange label="ETD" original={shipment.originalETD} current={shipment.etd} diff={etdDiff} color={badgeColor} textMuted={textMuted} text={text} />
        )}
        {hasOrigETA && (
          <DateChange label="ETA" original={shipment.originalETA} current={shipment.eta} diff={etaDiff} color={badgeColor} textMuted={textMuted} text={text} />
        )}
      </div>
    </div>
  );
}

function DateChange({ label, original, current, diff, color, textMuted, text }) {
  function fmt(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <div style={{ fontSize: 12 }}>
      <div style={{ color: textMuted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: text }}>
        <span style={{ textDecoration: 'line-through', opacity: 0.5 }}>{fmt(original)}</span>
        <ArrowRight size={10} color={textMuted} />
        <span style={{ fontWeight: 600 }}>{fmt(current)}</span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
          background: color, color: '#fff',
        }}>
          {diff > 0 ? '+' : ''}{diff}d
        </span>
      </div>
    </div>
  );
}
