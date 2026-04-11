// assistantContext.js — Builds the system prompt context sent to Claude
// Serialises live IndexedDB data into a compact readable snapshot.

const AI_WORKER_KEY = 'cargodesk_ai_worker_url';

export function getAiWorkerUrl() {
  try { return localStorage.getItem(AI_WORKER_KEY) || ''; } catch { return ''; }
}
export function setAiWorkerUrl(url) {
  try { localStorage.setItem(AI_WORKER_KEY, url); } catch {}
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fi-FI', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(d) {
  if (!d) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((new Date(d) - today) / 86400000);
}

// ─── Compact serialisers ──────────────────────────────────────────────────────

function serializeShipment(s, projects) {
  const proj = projects.find(p => p.id === s.projectId);
  const overdue = (s.milestones || []).filter(m => !m.done && m.date && daysUntil(m.date) < 0);
  const next    = (s.milestones || []).find(m => !m.done && m.date);
  const costs   = (s.costs?.items || []).reduce((a, i) => a + (i.amount || 0), 0);
  const running = (s.costs?.running || []).filter(r => r.status === 'running');

  const lines = [
    `ID: ${s.id}`,
    `Ref: ${s.ref || 'Pending'} ${s.customerRef ? `(${s.customerRef})` : ''}`,
    proj ? `Project: ${proj.name} — ${proj.customer}` : 'Project: Loose',
    `Route: ${s.origin} → ${s.destination}`,
    `Mode: ${s.mode} | Carrier: ${s.carrier || '—'}`,
    `Status: ${s.status}`,
    `ETD: ${fmtDate(s.etd)} | ETA: ${fmtDate(s.eta)}`,
    s.vessel && s.vessel !== 'TBD' ? `Vessel: ${s.vessel} ${s.voyage || ''}` : null,
    s.containerType ? `Containers: ${s.containerType}` : null,
    s.blNumber ? `BL: ${s.blNumber}` : null,
    `Quoted: €${s.costs?.quoted || 0} | Costs: €${Math.round(costs)}`,
    running.length ? `Running costs: ${running.map(r => r.desc).join(', ')}` : null,
    next ? `Next milestone: ${next.label} ${fmtDate(next.date)}` : null,
    overdue.length ? `OVERDUE milestones: ${overdue.map(m => m.label).join(', ')}` : null,
    s.billingDone ? 'Billing: done' : (s.status === 'delivered' ? 'Billing: PENDING' : null),
  ].filter(Boolean);

  return lines.join('\n  ');
}

function serializeProject(p, shipments) {
  const ps = shipments.filter(s => s.projectId === p.id);
  const active = ps.filter(s => !['delivered', 'completed'].includes(s.status));
  return `${p.name} — ${p.customer} (id:${p.id}) | ${ps.length} shipments, ${active.length} active`;
}

function serializeQuote(q) {
  const costs = (q.costs || []).map(c =>
    `  • ${c.description}: ${c.currency} ${c.amount}${c.perUnit && c.perUnit !== 'total' ? ` / ${c.perUnit}` : ''}`
  ).join('\n');
  return [
    `ID: ${q.id} | Carrier: ${q.carrier || '—'} | Route: ${q.origin || '—'} → ${q.destination || '—'}`,
    q.validUntil ? `Valid until: ${fmtDate(q.validUntil)}` : null,
    q.totalEUR ? `Total: €${q.totalEUR}` : null,
    costs || null,
  ].filter(Boolean).join('\n  ');
}

// ─── Main builder ─────────────────────────────────────────────────────────────

/**
 * Builds the system prompt string sent to Claude.
 * Called fresh on every message to include latest DB state.
 */
export function buildSystemPrompt(shipments = [], projects = [], quotes = [], rates = {}) {
  const today = new Date().toLocaleDateString('fi-FI', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const active    = shipments.filter(s => !['delivered', 'completed'].includes(s.status));
  const sailing   = active.filter(s => s.status === 'in_transit');
  const arriving  = sailing.filter(s => { const d = daysUntil(s.eta); return d !== null && d >= 0 && d <= 7; });
  const delivered = shipments.filter(s => s.status === 'delivered');

  // Separate active from recent delivered to keep context manageable
  const recentDelivered = delivered
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    .slice(0, 5);

  const shipmentsToShow = [
    ...active.sort((a, b) => (a.eta || 'z').localeCompare(b.eta || 'z')),
    ...recentDelivered,
  ];

  return `You are an AI assistant built into CargoDesk, a logistics shipment management app.
The user is Oscar, a project logistics specialist based in Finland.
Today is ${today}.

## Summary
- ${active.length} active shipments (${sailing.length} sailing, ${arriving.length} arriving this week)
- ${delivered.length} delivered total
- ${projects.length} projects
- Exchange rates: USD/EUR = ${(rates.USD || 1.08).toFixed(3)}, SEK/EUR = ${(rates.SEK || 11.2).toFixed(2)}

## Projects (${projects.length})
${projects.map(p => serializeProject(p, shipments)).join('\n') || 'None'}

## Shipments (${shipmentsToShow.length} shown — ${active.length} active + ${recentDelivered.length} recent delivered)
${shipmentsToShow.map(s => serializeShipment(s, projects)).join('\n\n') || 'None'}

${quotes.length > 0 ? `## Recent Quotes (${Math.min(quotes.length, 10)} of ${quotes.length})
${quotes.slice(0, 10).map(serializeQuote).join('\n\n')}` : ''}

## Your capabilities
- Answer questions about shipments, costs, margins, deadlines, milestones
- Create shipments (use create_shipment tool)
- Update shipment fields and status (use update_shipment tool)
- Add cost items (use add_cost_item tool)
- Mark milestones done (use mark_milestone_done tool)
- Add notes to shipments (use add_note tool)
- Navigate the UI to a shipment (use navigate_to_shipment tool)
- Parse documents dropped into the chat and extract structured data

## Instructions
- Be concise and direct
- Always confirm what actions you took
- Use Finnish date format (D.M.YYYY) in responses
- When creating shipments, generate a sensible routing string from origin → destination
- Default currency is EUR
- For milestones, standard ocean freight set: Cargo Ready, S/I Cut-off, VGM Cut-off, ETD, ETA, Customs Clearance, Delivered
- Shipment IDs are UUIDs — always use the exact id field when calling tools
- If asked to find a quote, search by route, carrier, or date in the quotes section above`;
}
