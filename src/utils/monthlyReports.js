// monthlyReports.js — Compute financial and CO2e report data for a given month
// Consumed by MonthlyReportModal.jsx

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function monthKey(year, month) {
  // month is 1-based (1=Jan)
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function monthLabel(year, month) {
  return new Date(year, month - 1, 1).toLocaleDateString('fi-FI', { month: 'long', year: 'numeric' });
}

/** Return all month keys (YYYY-MM) that appear in the shipment ETD dates, sorted desc */
export function availableMonths(shipments) {
  const keys = new Set();
  for (const s of shipments) {
    if (s.etd) keys.add(s.etd.slice(0, 7));
  }
  return [...keys].sort().reverse();
}

/** Convert amount to EUR using rates object (same as app's toEUR logic) */
function toEUR(amount, currency, rates) {
  if (!amount || !currency) return 0;
  const r = rates || {};
  if (currency === 'EUR') return amount;
  if (currency === 'USD') return amount / (r.USD || 1.08);
  if (currency === 'SEK') return amount / (r.SEK || 11.2);
  return amount; // fallback: treat as EUR
}

/** Sum all cost items + running costs for a shipment */
function shipmentTotalCosts(s, rates) {
  const items = (s.costs?.items || []).reduce(
    (acc, i) => acc + toEUR(i.amount, i.currency, rates), 0
  );
  const running = (s.costs?.running || []).reduce((acc, r) => {
    const days = r.status === 'running'
      ? Math.max(1, Math.ceil((new Date() - new Date(r.startDate)) / 86400000))
      : (r.totalDays || 0);
    return acc + toEUR(r.dailyRate * days, r.currency, rates);
  }, 0);
  return items + running;
}

// ─── Financial Report ─────────────────────────────────────────────────────────

/**
 * Returns financial report data for the given month.
 * { month, year, rows: [{project, customer, shipments: [{...}], totals}], grandTotal }
 */
export function computeFinancialReport(shipments, projects, year, month, rates) {
  const key = monthKey(year, month);
  const inMonth = shipments.filter(s => s.etd?.startsWith(key));

  // Group by project
  const projectMap = {};
  for (const s of inMonth) {
    const pid = s.projectId || '__loose__';
    if (!projectMap[pid]) projectMap[pid] = [];
    projectMap[pid].push(s);
  }

  const projectIndex = {};
  for (const p of projects) projectIndex[p.id] = p;

  const rows = Object.entries(projectMap).map(([pid, shipList]) => {
    const project = pid === '__loose__' ? null : projectIndex[pid];
    const shipRows = shipList.map(s => {
      const quoted = s.costs?.quoted || 0;
      const cost = shipmentTotalCosts(s, rates);
      return {
        id: s.id,
        ref: s.ref,
        customerRef: s.customerRef,
        mode: s.mode,
        origin: s.origin,
        destination: s.destination,
        carrier: s.carrier,
        status: s.status,
        etd: s.etd,
        eta: s.eta,
        quoted,
        cost,
        margin: quoted - cost,
        marginPct: quoted > 0 ? ((quoted - cost) / quoted) * 100 : 0,
      };
    });
    const totals = shipRows.reduce(
      (a, r) => ({ quoted: a.quoted + r.quoted, cost: a.cost + r.cost, margin: a.margin + r.margin }),
      { quoted: 0, cost: 0, margin: 0 }
    );
    totals.marginPct = totals.quoted > 0 ? (totals.margin / totals.quoted) * 100 : 0;
    return { projectId: pid, projectName: project?.name || 'Loose Shipments', customer: project?.customer || '—', shipments: shipRows, totals };
  });

  // Sort: named projects first, loose last
  rows.sort((a, b) => {
    if (a.projectId === '__loose__') return 1;
    if (b.projectId === '__loose__') return -1;
    return a.projectName.localeCompare(b.projectName);
  });

  const grandTotal = rows.reduce(
    (a, r) => ({ quoted: a.quoted + r.totals.quoted, cost: a.cost + r.totals.cost, margin: a.margin + r.totals.margin }),
    { quoted: 0, cost: 0, margin: 0 }
  );
  grandTotal.marginPct = grandTotal.quoted > 0 ? (grandTotal.margin / grandTotal.quoted) * 100 : 0;

  return { month, year, label: monthLabel(year, month), shipmentCount: inMonth.length, rows, grandTotal };
}

// ─── CO2e Report ──────────────────────────────────────────────────────────────

const MODE_ORDER = ['ocean', 'air', 'truck'];
const MODE_LABELS = { ocean: 'Ocean Freight', air: 'Air Freight', truck: 'Road / Truck' };

/**
 * Returns CO2e report data for the given month.
 * { month, year, byMode: [{mode, label, kg, shipmentCount, shipments}], totalKg, byProject: [...] }
 */
export function computeCO2eReport(shipments, projects, year, month) {
  const key = monthKey(year, month);
  const inMonth = shipments.filter(s => s.etd?.startsWith(key) && s.co2e?.kg > 0);

  // By mode
  const modeMap = {};
  for (const s of inMonth) {
    const m = s.mode || 'ocean';
    if (!modeMap[m]) modeMap[m] = [];
    modeMap[m].push(s);
  }

  const byMode = MODE_ORDER
    .filter(m => modeMap[m])
    .map(m => ({
      mode: m,
      label: MODE_LABELS[m] || m,
      kg: modeMap[m].reduce((a, s) => a + (s.co2e?.kg || 0), 0),
      shipmentCount: modeMap[m].length,
      shipments: modeMap[m].map(s => ({
        id: s.id,
        ref: s.ref,
        customerRef: s.customerRef,
        origin: s.origin,
        destination: s.destination,
        carrier: s.carrier,
        co2eKg: s.co2e?.kg || 0,
        distanceKm: s.co2e?.distanceKm || 0,
        containerType: s.containerType,
        etd: s.etd,
      })),
    }));

  const totalKg = byMode.reduce((a, m) => a + m.kg, 0);

  // By project
  const projectIndex = {};
  for (const p of projects) projectIndex[p.id] = p;
  const projMap = {};
  for (const s of inMonth) {
    const pid = s.projectId || '__loose__';
    if (!projMap[pid]) projMap[pid] = { kg: 0, count: 0 };
    projMap[pid].kg += s.co2e?.kg || 0;
    projMap[pid].count++;
  }
  const byProject = Object.entries(projMap).map(([pid, data]) => ({
    projectName: pid === '__loose__' ? 'Loose Shipments' : (projectIndex[pid]?.name || pid),
    kg: data.kg,
    count: data.count,
    pct: totalKg > 0 ? (data.kg / totalKg) * 100 : 0,
  })).sort((a, b) => b.kg - a.kg);

  return { month, year, label: monthLabel(year, month), shipmentCount: inMonth.length, byMode, byProject, totalKg };
}

// ─── Excel export ─────────────────────────────────────────────────────────────

/**
 * Export monthly financial report as .xlsx
 * Uses the xlsx library (already a dependency).
 */
export async function exportMonthlyExcel(financialData, co2eData) {
  const XLSX = await import('xlsx');

  const wb = XLSX.utils.book_new();

  // ── Financial sheet ──
  const finRows = [
    ['CargoDesk — Monthly Financial Report', '', '', '', '', '', ''],
    [financialData.label, '', '', '', '', '', ''],
    [''],
    ['Project', 'Reference', 'Route', 'Mode', 'Status', 'Quoted (EUR)', 'Costs (EUR)', 'Margin (EUR)', 'Margin %'],
  ];
  for (const row of financialData.rows) {
    for (const s of row.shipments) {
      finRows.push([
        row.projectName,
        s.ref || 'Pending',
        `${s.origin} → ${s.destination}`,
        s.mode,
        s.status,
        s.quoted,
        Math.round(s.cost),
        Math.round(s.margin),
        `${s.marginPct.toFixed(1)}%`,
      ]);
    }
    // Project subtotal
    finRows.push([
      `${row.projectName} TOTAL`, '', '', '', '',
      row.totals.quoted, Math.round(row.totals.cost), Math.round(row.totals.margin), `${row.totals.marginPct.toFixed(1)}%`,
    ]);
    finRows.push(['']);
  }
  // Grand total
  finRows.push([
    'GRAND TOTAL', '', '', '', '',
    financialData.grandTotal.quoted,
    Math.round(financialData.grandTotal.cost),
    Math.round(financialData.grandTotal.margin),
    `${financialData.grandTotal.marginPct.toFixed(1)}%`,
  ]);

  const finSheet = XLSX.utils.aoa_to_sheet(finRows);
  finSheet['!cols'] = [18, 14, 30, 8, 12, 14, 14, 14, 10].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, finSheet, 'Financial');

  // ── CO2e sheet ──
  const co2Rows = [
    ['CargoDesk — Monthly CO2e Report', '', '', '', ''],
    [co2eData.label, '', '', '', ''],
    ['', `Total: ${(co2eData.totalKg / 1000).toFixed(2)} tonnes CO2e`, '', '', ''],
    [''],
    ['Mode', 'Reference', 'Route', 'Carrier', 'ETD', 'CO2e (kg)', 'Distance (km)'],
  ];
  for (const modeGroup of co2eData.byMode) {
    for (const s of modeGroup.shipments) {
      co2Rows.push([
        modeGroup.label,
        s.ref || 'Pending',
        `${s.origin} → ${s.destination}`,
        s.carrier,
        s.etd,
        Math.round(s.co2eKg),
        Math.round(s.distanceKm),
      ]);
    }
    co2Rows.push([`${modeGroup.label} TOTAL`, '', '', '', '', Math.round(modeGroup.kg), '']);
    co2Rows.push(['']);
  }
  co2Rows.push(['TOTAL CO2e (kg)', '', '', '', '', Math.round(co2eData.totalKg), '']);
  co2Rows.push(['TOTAL CO2e (tonnes)', '', '', '', '', (co2eData.totalKg / 1000).toFixed(3), '']);

  const co2Sheet = XLSX.utils.aoa_to_sheet(co2Rows);
  co2Sheet['!cols'] = [20, 14, 30, 20, 12, 14, 14].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, co2Sheet, 'CO2e');

  // Download
  const filename = `CargoDesk_${financialData.label.replace(/\s/g, '_')}_Report.xlsx`;
  XLSX.writeFile(wb, filename);
}
