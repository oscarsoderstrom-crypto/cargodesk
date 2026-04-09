import { useState, useEffect } from "react";
import { Navigation, ExternalLink, RefreshCw, Clock, MapPin, Ship, AlertTriangle, CheckCircle2, Circle, ChevronDown, ChevronRight, Settings, Anchor, ArrowRight } from "lucide-react";
import { fetchTracking, getTrackingUrl, isTrackingConfigured, getCarrierTrackingSupport, setLastPollTime } from "../utils/tracking.js";
import { updateShipment, addActivity } from "../db/schema.js";

const STATUS_FLOW = [
  { id: 'planned', label: 'Planned', color: '#8494B0' },
  { id: 'booked', label: 'Booked', color: '#F59E0B' },
  { id: 'in_transit', label: 'In Transit', color: '#3B82F6' },
  { id: 'arrived', label: 'Arrived', color: '#A78BFA' },
  { id: 'delivered', label: 'Delivered', color: '#10B981' },
  { id: 'completed', label: 'Completed', color: '#6B7280' },
];

export default function TrackingTab({ T, shipment, onUpdate }) {
  const [trackingData, setTrackingData] = useState(shipment.lastTracking || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showEvents, setShowEvents] = useState(true);

  const mono = "'JetBrains Mono',monospace";
  const bookingRef = shipment.carrierBookingNumber || shipment.ref || '';
  const carrier = shipment.carrier || '';
  const { hasDirectLink, hasApiTracking } = getCarrierTrackingSupport(carrier);
  const trackingUrl = getTrackingUrl(carrier, bookingRef);
  const configured = isTrackingConfigured();

  const fmtDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('fi-FI', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return d; }
  };

  const fmtDateShort = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('fi-FI', { day: 'numeric', month: 'short' }); }
    catch { return d; }
  };

  // ── Track via worker ──
  const handleTrackNow = async () => {
    if (!carrier || !bookingRef) { setError('No carrier or booking number on this shipment.'); return; }
    setLoading(true); setError(null);
    try {
      const result = await fetchTracking(carrier, bookingRef);
      setTrackingData(result);
      setLastPollTime(shipment.id);

      // Save tracking data but do NOT auto-update status from unreliable scraping
      const updates = { lastTracking: result, lastTrackingAt: new Date().toISOString() };

      // Only update ETA if we got real events (not from page scraping guesses)
      if (result.success && result.events && result.events.length > 0 && result.eta) {
        const newEta = result.eta.slice(0, 10);
        if (newEta !== shipment.eta) {
          if (!shipment.originalETA && shipment.eta) updates.originalETA = shipment.eta;
          updates.eta = newEta;
        }
      }

      await updateShipment(shipment.id, updates);
      if (onUpdate) onUpdate();
      if (!result.success && result.error) setError(result.error);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  // ── Manual quick-status update ──
  const handleStatusUpdate = async (newStatus) => {
    const prev = shipment.status;
    await updateShipment(shipment.id, { status: newStatus, updatedAt: new Date().toISOString() });
    await addActivity({ id: crypto.randomUUID(), type: 'status', message: `Status updated: ${prev.replace('_', ' ')} → ${newStatus.replace('_', ' ')}`, shipmentId: shipment.id, timestamp: new Date().toISOString() });
    if (onUpdate) onUpdate();
  };

  const currentStatusIdx = STATUS_FLOW.findIndex(s => s.id === shipment.status);

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 14, color: T.text2 }}>
            Tracking: <strong style={{ color: T.text0, fontFamily: mono }}>{bookingRef || 'No booking number'}</strong>
            {carrier && <span style={{ marginLeft: 8, color: T.text3 }}>via {carrier}</span>}
          </div>
          {trackingData?.lastUpdated && (
            <div style={{ fontSize: 12, color: T.text3, marginTop: 4 }}>Last checked: {fmtDate(trackingData.lastUpdated)}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {trackingUrl && (
            <a href={trackingUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: T.accent, background: T.accentGlow, border: `1px solid rgba(59,130,246,0.2)`, cursor: 'pointer', textDecoration: 'none' }}>
              <ExternalLink size={14} /> Track on {carrier}
            </a>
          )}
          {configured && hasApiTracking && bookingRef && (
            <button onClick={handleTrackNow} disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: loading ? T.text3 : T.green, background: T.greenBg, border: `1px solid ${T.greenBorder}`, cursor: loading ? 'default' : 'pointer' }}>
              <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
              {loading ? 'Tracking...' : 'Track Now'}
            </button>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}`}</style>

      {/* ── Error ── */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 10, marginBottom: 16, border: `1px solid ${T.amberBorder}`, background: T.amberBg }}>
          <AlertTriangle size={18} color={T.amber} />
          <div style={{ flex: 1, fontSize: 13, color: T.text1 }}>{error}</div>
        </div>
      )}

      {/* ── Current status + quick update ── */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: T.text2, marginBottom: 12 }}>Shipment Status</h3>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {STATUS_FLOW.map((s, i) => {
            const isCurrent = s.id === shipment.status;
            const isPast = i < currentStatusIdx;
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button onClick={() => handleStatusUpdate(s.id)}
                  style={{
                    padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: isCurrent ? s.color : isPast ? `${s.color}22` : T.bg3,
                    color: isCurrent ? '#fff' : isPast ? s.color : T.text3,
                    border: `1px solid ${isCurrent ? s.color : isPast ? `${s.color}44` : T.border1}`,
                  }}>
                  {s.label}
                </button>
                {i < STATUS_FLOW.length - 1 && <ArrowRight size={12} color={T.text3} />}
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: T.text3, marginTop: 8 }}>
          Click a status to update after checking the carrier's tracking page.
        </div>
      </div>

      {/* ── Shipment route overview ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ padding: 16, borderRadius: 12, background: T.bg2, border: `1px solid ${T.border1}` }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: T.text3, marginBottom: 4 }}>Origin</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: T.text0 }}>{shipment.origin || '—'}</div>
          {shipment.etd && <div style={{ fontSize: 12, color: T.text3, marginTop: 4 }}>ETD: {fmtDateShort(shipment.etd)}</div>}
        </div>
        {shipment.vessel && shipment.vessel !== '—' && shipment.vessel !== 'TBD' && (
          <div style={{ padding: 16, borderRadius: 12, background: T.bg2, border: `1px solid ${T.border1}` }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: T.text3, marginBottom: 4 }}>Vessel</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: T.text0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Ship size={14} color={T.accent} /> {shipment.vessel}
            </div>
            {shipment.voyage && <div style={{ fontSize: 12, color: T.text3 }}>Voy. {shipment.voyage}</div>}
          </div>
        )}
        <div style={{ padding: 16, borderRadius: 12, background: T.bg2, border: `1px solid ${T.border1}` }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: T.text3, marginBottom: 4 }}>Destination</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: T.text0 }}>{shipment.destination || '—'}</div>
          {shipment.eta && <div style={{ fontSize: 12, color: T.text3, marginTop: 4 }}>ETA: {fmtDateShort(shipment.eta)}</div>}
        </div>
      </div>

      {/* ── Tracking events from API ── */}
      {trackingData?.events?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div onClick={() => setShowEvents(!showEvents)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, cursor: 'pointer' }}>
            {showEvents ? <ChevronDown size={16} color={T.text2} /> : <ChevronRight size={16} color={T.text2} />}
            <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: T.text2, margin: 0 }}>
              Carrier Events ({trackingData.events.length})
            </h3>
          </div>
          {showEvents && (
            <div style={{ borderRadius: 10, border: `1px solid ${T.border1}`, overflow: 'hidden' }}>
              {trackingData.events.map((evt, i) => {
                const isLatest = i === trackingData.events.length - 1;
                return (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: i < trackingData.events.length - 1 ? `1px solid ${T.border0}` : 'none', background: isLatest ? T.accentGlow : T.bg2 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24 }}>
                      {isLatest ? <CheckCircle2 size={18} color={T.accent} /> : <Circle size={14} color={T.text3} style={{ marginTop: 2 }} />}
                      {i < trackingData.events.length - 1 && <div style={{ width: 2, flex: 1, background: T.border1, minHeight: 16, marginTop: 4 }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: isLatest ? 600 : 400, color: isLatest ? T.text0 : T.text1 }}>{evt.description}</div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 12, color: T.text3 }}>
                        {evt.location && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} /> {evt.location}</span>}
                        {evt.date && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} /> {fmtDate(evt.date)}</span>}
                        {evt.vessel && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Ship size={11} /> {evt.vessel}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Routing from booking data ── */}
      {shipment.routing && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: T.text2, marginBottom: 12 }}>Route</h3>
          <div style={{ padding: 16, borderRadius: 10, background: T.bg2, border: `1px solid ${T.border1}`, fontSize: 14, color: T.text1 }}>
            {shipment.routing}
          </div>
        </div>
      )}

      {/* ── Direct link helper for non-API carriers ── */}
      {!hasApiTracking && hasDirectLink && bookingRef && (
        <div style={{ padding: 20, borderRadius: 12, border: `1px solid ${T.border1}`, background: T.bg2, textAlign: 'center' }}>
          <Navigation size={28} color={T.text3} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <div style={{ fontSize: 14, fontWeight: 500, color: T.text1, marginBottom: 8 }}>
            Automated tracking is not yet available for {carrier}
          </div>
          <div style={{ fontSize: 13, color: T.text3, marginBottom: 16 }}>
            Click the button below to check on the carrier's website, then update the status above.
          </div>
          <a href={trackingUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#fff', background: T.accent, textDecoration: 'none', cursor: 'pointer' }}>
            <ExternalLink size={16} /> Open {carrier} Tracking
          </a>
        </div>
      )}

      {/* ── No booking number ── */}
      {!bookingRef && (
        <div style={{ padding: 32, borderRadius: 12, border: `1px dashed ${T.border2}`, textAlign: 'center', color: T.text3, fontSize: 13, background: T.bg2 }}>
          <Navigation size={28} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <div>No carrier booking number on this shipment yet.</div>
          <div style={{ marginTop: 4 }}>Drop a booking confirmation PDF on the Documents tab to auto-extract it.</div>
        </div>
      )}

      {/* ── Not configured ── */}
      {!configured && hasApiTracking && bookingRef && (
        <div style={{ padding: 16, borderRadius: 10, border: `1px solid ${T.amberBorder}`, background: T.amberBg, marginTop: 16 }}>
          <div style={{ fontSize: 13, color: T.text1 }}>
            <strong>Tip:</strong> Set your Cloudflare Worker URL in Settings to enable automatic tracking via API.
          </div>
        </div>
      )}
    </div>
  );
}
