// weeklySnapshot.js — Compute current situation snapshot for the weekly report

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

function daysSince(dateStr) {
  const d = daysUntil(dateStr);
  return d !== null ? -d : null;
}

function toEUR(amount, currency, rates) {
  const r = rates || {};
  if (!amount) return 0;
  if (currency === 'EUR') return amount;
  if (currency === 'USD') return amount / (r.USD || 1.08);
  if (currency === 'SEK') return amount / (r.SEK || 11.2);
  return amount;
}

function shipmentCosts(s, rates) {
  return (s.costs?.items || []).reduce((a, i) => a + toEUR(i.amount, i.currency, rates), 0) +
    (s.costs?.running || []).reduce((acc, r) => {
      const days = r.status === 'running'
        ? Math.max(1, Math.ceil((new Date() - new Date(r.startDate)) / 86400000))
        : (r.totalDays || 0);
      return acc + toEUR(r.dailyRate * days, r.currency, rates);
    }, 0);
}

/**
 * Compute the weekly situation snapshot.
 *
 * Returns:
 * {
 *   generatedAt,
 *   departed:    shipments that left in the past 7 days (ETD within last 7 days)
 *   sailing:     shipments currently in transit (status = in_transit)
 *   arrivingSoon: sailing shipments with ETA in next 7 days
 *   arrived:     shipments with status 'arrived' or ETA passed and in_transit
 *   billingPending: delivered shipments where billing likely not done
 * }
 */
export function computeWeeklySnapshot(shipments = [], projects = [], rates) {
  const projectIndex = {};
  for (const p of projects) projectIndex[p.id] = p;

  function enrichShipment(s) {
    const cost = shipmentCosts(s, rates);
    return {
      id: s.id,
      ref: s.ref,
      customerRef: s.customerRef,
      mode: s.mode,
      status: s.status,
      origin: s.origin,
      destination: s.destination,
      carrier: s.carrier,
      vessel: s.vessel,
      voyage: s.voyage,
      routing: s.routing,
      etd: s.etd,
      eta: s.eta,
      containerType: s.containerType,
      milestones: s.milestones || [],
      projectName: s.projectId ? (projectIndex[s.projectId]?.name || null) : null,
      customer: s.projectId ? (projectIndex[s.projectId]?.customer || null) : null,
      quoted: s.costs?.quoted || 0,
      cost,
      margin: (s.costs?.quoted || 0) - cost,
      hasRunningCosts: (s.costs?.running || []).some(r => r.status === 'running'),
      billingDone: s.billingDone || false,
      daysUntilETA: daysUntil(s.eta),
      daysSinceETD: daysSince(s.etd),
    };
  }

  const now = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const sevenDaysAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  // Departed this week: ETD in last 7 days, not planned
  const departed = shipments
    .filter(s => s.etd && s.etd >= sevenDaysAgo && s.etd <= now && s.status !== 'planned')
    .map(enrichShipment)
    .sort((a, b) => (b.etd || '').localeCompare(a.etd || ''));

  // Currently sailing
  const sailing = shipments
    .filter(s => s.status === 'in_transit')
    .map(enrichShipment)
    .sort((a, b) => (a.eta || 'z').localeCompare(b.eta || 'z'));

  // Arriving soon: sailing + ETA in next 7 days
  const arrivingSoon = sailing.filter(s => s.eta && s.eta >= now && s.eta <= sevenDaysAhead);

  // Arrived: status = arrived OR (in_transit and ETA has passed)
  const arrived = shipments
    .filter(s => s.status === 'arrived' || (s.status === 'in_transit' && s.eta && s.eta < now))
    .map(enrichShipment)
    .sort((a, b) => (b.eta || '').localeCompare(a.eta || ''));

  // Billing pending: delivered, has cost items, not marked done
  const billingPending = shipments
    .filter(s => s.status === 'delivered' && !s.billingDone && (s.costs?.items || []).length > 0)
    .map(enrichShipment)
    .sort((a, b) => (b.eta || '').localeCompare(a.eta || ''));

  return {
    generatedAt: new Date().toISOString(),
    departed,
    sailing,
    arrivingSoon,
    arrived,
    billingPending,
  };
}
