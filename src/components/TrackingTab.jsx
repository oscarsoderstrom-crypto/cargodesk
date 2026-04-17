// TrackingTab.jsx — Carrier tracking tab for ShipmentDetail
// Props: T, shipment, onUpdate

import { useState, useEffect, useCallback } from 'react';
import {
  ExternalLink, RefreshCw, MapPin, Ship, CheckCircle2,
  Clock, AlertTriangle, Navigation, Copy, Check, Anchor, Info,
} from 'lucide-react';
import {
  getDirectTrackingUrl, getBestRef,
  getTrackingLog, addTrackingEvent, setLastChecked, getLastChecked,
  fetchVesselPosition, isTrackingConfigured,
} from '../utils/tracking.js';
import { updateShipment, addActivity } from '../db/schema.js';
import { timeAgo } from '../utils/activityLog.js';

// ─── Status options for quick update ─────────────────────────────────────────

const STATUS_OPTIONS = [
  { id: 'planned',    label: 'Planned',    color: null },
  { id: 'booked',     label: 'Booked',     color: 'amber' },
  { id: 'in_transit', label: 'In Transit', color: 'accent' },
  { id: 'arrived',    label: 'Arrived',    color: 'purple' },
  { id: 'delivered',  label: 'Delivered',  color: 'green' },
];

// ─── Event type config ────────────────────────────────────────────────────────

function eventIcon(type) {
  switch (type) {
    case 'departed':   return <Ship size={13} />;
    case 'arrived':    return <Anchor size={13} />;
    case 'in_transit': return <Navigation size={13} />;
    case 'manual':     return <CheckCircle2 size={13} />;
    case 'vessel':     return <MapPin size={13} />;
    default:           return <Clock size={13} />;
  }
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text, T }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }
  return (
    <button onClick={handleCopy} title="Copy to clipboard"
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? T.green : T.text3, padding: '2px 4px', display: 'flex', alignItems: 'center' }}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TrackingTab({ T, shipment, onUpdate }) {
  const [log, setLog]               = useState([]);
  const [vesselPos, setVesselPos]   = useState(null);
  const [loadingPos, setLoadingPos] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [noteInput, setNoteInput]   = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const ref      = getBestRef(shipment);
  const trackUrl = ref ? getDirectTrackingUrl(shipment.carrier, ref) : null;
  const lastCheck = getLastChecked(shipment.id);
  const configured = isTrackingConfigured();

  // Load local event log
  useEffect(() => {
    setLog(getTrackingLog(shipment.id));
  }, [shipment.id]);

  // ── Status quick-update ───────────────────────────────────────────────────

  async function handleStatusUpdate(newStatus) {
    if (newStatus === shipment.status) return;
    setUpdatingStatus(newStatus);
    try {
      await updateShipment(shipment.id, { status: newStatus });
      await addActivity({
        id: crypto.randomUUID(), type: 'status',
        message: `Status updated to ${newStatus.replace('_', ' ')} via tracking tab`,
        shipmentId: shipment.id, timestamp: new Date().toISOString(),
      });
      const entry = addTrackingEvent(shipment.id, {
        type: 'manual',
        description: `Status updated: ${newStatus.replace('_', ' ')}`,
        source: 'Manual update',
      });
      setLog(getTrackingLog(shipment.id));
      setLastChecked(shipment.id);
      if (onUpdate) onUpdate();
    } finally {
      setUpdatingStatus(null);
    }
  }

  // ── "I checked it" — log a check-in without status change ────────────────

  function handleChecked() {
    const statusLabels = { planned: 'Planned', booked: 'Booked', in_transit: 'In Transit', arrived: 'Arrived', delivered: 'Delivered' };
    addTrackingEvent(shipment.id, {
      type: 'manual',
      description: `Checked on carrier website — status confirmed: ${statusLabels[shipment.status] || shipment.status}`,
      source: 'Manual check',
    });
    setLastChecked(shipment.id);
    setLog(getTrackingLog(shipment.id));
  }

  // ── Add manual note to tracking log ──────────────────────────────────────

  async function handleAddNote(e) {
    e.preventDefault();
    if (!noteInput.trim()) return;
    setSavingNote(true);
    try {
      addTrackingEvent(shipment.id, {
        type: 'note',
        description: noteInput.trim(),
        source: 'Manual note',
      });
      await addActivity({
        id: crypto.randomUUID(), type: 'note',
        message: `Tracking note: ${noteInput.trim()}`,
        shipmentId: shipment.id, timestamp: new Date().toISOString(),
      });
      setLog(getTrackingLog(shipment.id));
      setNoteInput('');
      if (onUpdate) onUpdate();
    } finally {
      setSavingNote(false);
    }
  }

  // ── Vessel position ───────────────────────────────────────────────────────

  async function handleFetchPosition() {
    if (!shipment.vessel || shipment.vessel === 'TBD' || shipment.vessel === '—') return;
    setLoadingPos(true);
    try {
      const pos = await fetchVesselPosition(shipment.vessel, shipment.imoNumber);
      setVesselPos(pos);
      if (pos) {
        addTrackingEvent(shipment.id, {
          type: 'vessel',
          description: `Vessel position updated — ${pos.destination ? `heading to ${pos.destination}` : 'position recorded'}`,
          source: pos.source,
          lat: pos.lat,
          lng: pos.lng,
        });
        setLog(getTrackingLog(shipment.id));
      }
    } finally {
      setLoadingPos(false);
    }
  }

  const hasVessel = shipment.vessel && shipment.vessel !== 'TBD' && shipment.vessel !== '—';

  const inputStyle = {
    flex: 1, padding: '8px 12px', borderRadius: 7, fontSize: 13,
    border: `1px solid ${T.border1}`, background: T.bg3, color: T.text0, outline: 'none',
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 600 }}>

      {/* ── Reference row ── */}
      <div style={{ padding: '12px 16px', borderRadius: 10, background: T.bg2, border: `1px solid ${T.border1}`, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.text3, marginBottom: 10 }}>Tracking Reference</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'BL / SWB',      value: shipment.blNumber },
            { label: 'Booking Ref',   value: shipment.ref },
            { label: 'Customer Ref',  value: shipment.customerRef },
            { label: 'Quotation No.', value: shipment.quotationNumber },
          ].filter(r => r.value).map(r => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: T.text3 }}>{r.label}:</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.text0, fontFamily: "'JetBrains Mono', monospace" }}>{r.value}</span>
              <CopyButton text={r.value} T={T} />
            </div>
          ))}
          {!ref && (
            <div style={{ fontSize: 13, color: T.text3, fontStyle: 'italic' }}>No tracking reference yet — add BL number or booking reference in Overview.</div>
          )}
        </div>
      </div>

      {/* ── Open on carrier website ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {trackUrl ? (
          <a href={trackUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'white', background: T.accent, border: 'none', cursor: 'pointer', textDecoration: 'none' }}>
            <ExternalLink size={14} /> Track on {shipment.carrier || 'carrier website'}
          </a>
        ) : (
          <div style={{ fontSize: 13, color: T.text3, padding: '9px 0' }}>
            {!ref ? 'Add a booking reference to enable tracking.' : `No direct tracking link for ${shipment.carrier || 'this carrier'}.`}
          </div>
        )}

        {trackUrl && (
          <button onClick={handleChecked}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: T.green, background: T.greenBg, border: `1px solid ${T.greenBorder}`, cursor: 'pointer' }}>
            <CheckCircle2 size={14} /> I checked it
          </button>
        )}
      </div>

      {lastCheck && (
        <div style={{ fontSize: 12, color: T.text3, marginBottom: 16 }}>
          Last checked: {timeAgo(lastCheck)}
        </div>
      )}

      {/* ── Status quick-update ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.text3, marginBottom: 10 }}>Update Status</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUS_OPTIONS.map(opt => {
            const isActive = shipment.status === opt.id;
            const isLoading = updatingStatus === opt.id;
            const color = opt.color ? T[opt.color] : T.text2;
            const bg = opt.color ? T[`${opt.color}Bg`] : T.bg3;
            const border = opt.color ? T[`${opt.color}Border`] : T.border1;
            return (
              <button key={opt.id}
                onClick={() => handleStatusUpdate(opt.id)}
                disabled={isLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: isActive ? 700 : 500,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  background: isActive ? (opt.color ? T[opt.color] : T.bg4) : bg,
                  color: isActive ? 'white' : color,
                  border: `1px solid ${isActive ? (opt.color ? T[opt.color] : T.border2) : border}`,
                  opacity: isLoading ? 0.6 : 1,
                  transition: 'all 0.15s',
                }}>
                {isLoading
                  ? <RefreshCw size={11} style={{ animation: 'spin 0.8s linear infinite' }} />
                  : isActive && <CheckCircle2 size={11} />}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Vessel position ── */}
      {hasVessel && (
        <div style={{ marginBottom: 20, padding: '14px 16px', borderRadius: 10, background: T.bg2, border: `1px solid ${T.border1}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: vesselPos ? 12 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Ship size={15} color={T.accent} />
              <span style={{ fontSize: 13, fontWeight: 600, color: T.text0 }}>{shipment.vessel}</span>
              {shipment.voyage && shipment.voyage !== 'TBD' && <span style={{ fontSize: 12, color: T.text3 }}>Voy. {shipment.voyage}</span>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleFetchPosition} disabled={loadingPos || !configured}
                title={configured ? 'Fetch vessel position' : 'Set tracking worker URL in Settings first'}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: configured ? 'pointer' : 'not-allowed', color: T.accent, background: T.accentGlow, border: `1px solid rgba(59,130,246,0.2)`, opacity: configured ? 1 : 0.5 }}>
                <RefreshCw size={12} style={{ animation: loadingPos ? 'spin 0.8s linear infinite' : 'none' }} />
                {loadingPos ? 'Loading…' : 'Get Position'}
              </button>
              {/* MarineTraffic link */}
              <a href={`https://www.marinetraffic.com/en/ais/home/shipname:${encodeURIComponent(shipment.vessel)}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500, color: T.text2, background: T.bg3, border: `1px solid ${T.border1}`, textDecoration: 'none' }}>
                <ExternalLink size={11} /> MarineTraffic
              </a>
            </div>
          </div>

          {vesselPos && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8, paddingTop: 10, borderTop: `1px solid ${T.border0}` }}>
              {[
                { label: 'Lat/Lng', value: `${vesselPos.lat?.toFixed(4)}, ${vesselPos.lng?.toFixed(4)}` },
                { label: 'Speed', value: vesselPos.speed ? `${vesselPos.speed} knots` : null },
                { label: 'Destination', value: vesselPos.destination },
                { label: 'Vessel ETA', value: vesselPos.eta },
                { label: 'Source', value: vesselPos.source },
              ].filter(f => f.value).map(f => (
                <div key={f.label}>
                  <div style={{ fontSize: 10, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</div>
                  <div style={{ fontSize: 12, color: T.text1, fontWeight: 500 }}>{f.value}</div>
                </div>
              ))}
            </div>
          )}

          {!configured && (
            <div style={{ marginTop: 8, fontSize: 11, color: T.text3, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Info size={11} /> Set tracking worker URL in Settings → Tracking to enable position lookup.
            </div>
          )}
        </div>
      )}

      {/* ── Add note ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.text3, marginBottom: 10 }}>Add Tracking Note</div>
        <form onSubmit={handleAddNote} style={{ display: 'flex', gap: 8 }}>
          <input
            value={noteInput}
            onChange={e => setNoteInput(e.target.value)}
            placeholder="e.g. Vessel delayed at Bremerhaven, new ETA June 5"
            style={inputStyle}
          />
          <button type="submit" disabled={savingNote || !noteInput.trim()}
            style={{ padding: '8px 14px', borderRadius: 7, fontSize: 13, fontWeight: 600, color: 'white', background: noteInput.trim() ? T.accent : T.bg4, border: 'none', cursor: noteInput.trim() ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>
            Add Note
          </button>
        </form>
      </div>

      {/* ── Tracking event log ── */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.text3, marginBottom: 10 }}>
          Tracking Log {log.length > 0 && `(${log.length})`}
        </div>

        {log.length === 0 ? (
          <div style={{ padding: '20px 16px', borderRadius: 10, background: T.bg2, border: `1px dashed ${T.border1}`, textAlign: 'center', fontSize: 13, color: T.text3 }}>
            No tracking events yet. Open the carrier website and confirm the status using the buttons above.
          </div>
        ) : (
          <div style={{ borderRadius: 10, border: `1px solid ${T.border1}`, overflow: 'hidden' }}>
            {log.map((entry, i) => (
              <div key={entry.id || i}
                style={{ display: 'flex', gap: 12, padding: '10px 16px', borderBottom: i < log.length - 1 ? `1px solid ${T.border0}` : 'none', background: T.bg2 }}>
                <div style={{ color: T.accent, flexShrink: 0, marginTop: 2 }}>
                  {eventIcon(entry.type)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: T.text0, lineHeight: 1.4 }}>{entry.description}</div>
                  {entry.source && <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>{entry.source}</div>}
                </div>
                <div style={{ fontSize: 11, color: T.text3, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                  {timeAgo(entry.timestamp)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
