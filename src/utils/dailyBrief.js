// dailyBrief.js — Compute morning to-do items from all active shipments and quotes
// Used by MorningBrief.jsx. Pure data logic, no UI.

const BRIEF_KEY = 'cargodesk_brief_lastShown';

// ─── Persistence ─────────────────────────────────────────────────────────────

export function shouldShowBrief() {
  try {
    const last = localStorage.getItem(BRIEF_KEY);
    if (!last) return true;
    return last !== new Date().toISOString().slice(0, 10);
  } catch { return false; }
}

export function markBriefShown() {
  try {
    localStorage.setItem(BRIEF_KEY, new Date().toISOString().slice(0, 10));
  } catch {}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

function shipmentLabel(s) {
  return s.customerRef || s.ref || 'Pending ref';
}

function routeLabel(s) {
  const o = s.origin?.split(',')[0]?.trim() || s.origin || '?';
  const d = s.destination?.split(',')[0]?.trim() || s.destination || '?';
  return `${o} → ${d}`;
}

// ─── Main computation ─────────────────────────────────────────────────────────

/**
 * Returns an array of brief items sorted by urgency.
 * Each item: { id, type, category, priority, title, detail, shipmentId, daysUntil, date }
 *
 * type:     'overdue' | 'today' | 'upcoming' | 'action' | 'info'
 * category: 'milestone' | 'eta_passed' | 'arrived' | 'running_cost' | 'billing' | 'quote_expiry'
 * priority: 1 (critical) → 4 (informational)
 */
export function computeBriefItems(shipments = [], quotes = []) {
  const items = [];

  for (const s of shipments) {
    const isActive = !['delivered', 'completed'].includes(s.status);

    // ── Overdue / upcoming milestones (all non-delivered shipments) ──
    if (isActive) {
      for (const m of (s.milestones || [])) {
        if (m.done || !m.date) continue;
        const d = daysUntil(m.date);
        if (d === null || d > 5) continue;

        const type = d < 0 ? 'overdue' : d === 0 ? 'today' : 'upcoming';
        const priority = d < 0 ? 1 : d === 0 ? 1 : d <= 2 ? 2 : 3;
        const dayLabel = d < 0
          ? `${Math.abs(d)}d overdue`
          : d === 0 ? 'today'
          : `in ${d}d`;

        items.push({
          id: `ms-${s.id}-${m.id}`,
          type,
          category: 'milestone',
          priority,
          title: m.label,
          detail: `${shipmentLabel(s)} · ${routeLabel(s)} · ${dayLabel}`,
          shipmentId: s.id,
          daysUntil: d,
          date: m.date,
        });
      }
    }

    // ── Sailing shipment with ETA passed ──
    if (s.status === 'in_transit' && s.eta) {
      const d = daysUntil(s.eta);
      if (d !== null && d < 0) {
        items.push({
          id: `eta-${s.id}`,
          type: 'overdue',
          category: 'eta_passed',
          priority: 1,
          title: `ETA passed — verify arrival`,
          detail: `${shipmentLabel(s)} · ${routeLabel(s)} · ETA was ${new Date(s.eta).toLocaleDateString('fi-FI', { day: 'numeric', month: 'short' })}`,
          shipmentId: s.id,
          daysUntil: d,
          date: s.eta,
        });
      }
    }

    // ── Arrived, awaiting delivery confirmation ──
    if (s.status === 'arrived') {
      items.push({
        id: `arr-${s.id}`,
        type: 'action',
        category: 'arrived',
        priority: 2,
        title: `Arrived — confirm delivery`,
        detail: `${shipmentLabel(s)} · ${routeLabel(s)}`,
        shipmentId: s.id,
        daysUntil: 0,
        date: s.eta,
      });
    }

    // ── Active running costs ──
    const runningActive = (s.costs?.running || []).filter(r => r.status === 'running');
    if (runningActive.length > 0) {
      const desc = runningActive.map(r => r.desc).join(', ');
      items.push({
        id: `run-${s.id}`,
        type: 'action',
        category: 'running_cost',
        priority: 3,
        title: `Running cost active`,
        detail: `${shipmentLabel(s)} · ${desc}`,
        shipmentId: s.id,
        daysUntil: null,
        date: null,
      });
    }

    // ── Delivered shipments that likely need billing / invoicing ──
    if (s.status === 'delivered' && !s.billingDone && (s.costs?.items || []).length > 0) {
      items.push({
        id: `bill-${s.id}`,
        type: 'action',
        category: 'billing',
        priority: 3,
        title: `Billing pending`,
        detail: `${shipmentLabel(s)} · ${routeLabel(s)}`,
        shipmentId: s.id,
        daysUntil: null,
        date: null,
      });
    }
  }

  // ── Expiring quotes ──
  for (const q of quotes) {
    if (!q.validUntil) continue;
    const d = daysUntil(q.validUntil);
    if (d === null || d < 0 || d > 5) continue;
    items.push({
      id: `qexp-${q.id}`,
      type: d === 0 ? 'today' : 'upcoming',
      category: 'quote_expiry',
      priority: d <= 1 ? 2 : 3,
      title: `Quote expiring ${d === 0 ? 'today' : `in ${d}d`}`,
      detail: `${q.carrier || '—'} · ${q.origin || ''} → ${q.destination || ''}`,
      shipmentId: q.shipmentId || null,
      daysUntil: d,
      date: q.validUntil,
    });
  }

  // Sort: priority asc, then daysUntil asc (null last)
  items.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const da = a.daysUntil ?? 999;
    const db = b.daysUntil ?? 999;
    return da - db;
  });

  return items;
}

// ─── Summary stats for the brief header ──────────────────────────────────────

export function computeBriefSummary(shipments = []) {
  const active = shipments.filter(s => !['delivered', 'completed'].includes(s.status));
  const sailing = active.filter(s => s.status === 'in_transit');
  const arriving = sailing.filter(s => {
    const d = daysUntil(s.eta);
    return d !== null && d >= 0 && d <= 7;
  });
  const overdueMilestones = active.reduce((count, s) =>
    count + (s.milestones || []).filter(m => !m.done && m.date && daysUntil(m.date) < 0).length, 0);
  const pendingBilling = shipments.filter(s =>
    s.status === 'delivered' && !s.billingDone && (s.costs?.items || []).length > 0).length;

  return {
    activeShipments: active.length,
    sailingShipments: sailing.length,
    arrivingSoon: arriving.length,
    overdueMilestones,
    pendingBilling,
  };
}
