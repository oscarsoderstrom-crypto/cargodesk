/**
 * Financial Excel export.
 * Generates .xlsx files with shipment financial data.
 *
 * Requires: npm install xlsx
 *
 * Modes:
 * - "profit_loss": Shows quoted, costs, and margin per shipment
 * - "profit_only": Shows only quoted and margin
 * - "costs_only": Shows only cost breakdown
 *
 * Group by: "shipment" or "project"
 */
import * as XLSX from "xlsx";

const FX = { EUR: 1, USD: 1.08, SEK: 11.42, GBP: 0.86 };
const toEUR = (a, c, rates) => a / ((rates || FX)[c] || 1);

function calcShipmentFinancials(s, rates) {
  const items = s.costs?.items || [];
  const running = s.costs?.running || [];
  const totalItems = items.reduce((sum, c) => sum + toEUR(c.amount, c.currency, rates), 0);
  const totalRunning = running.reduce((sum, r) => {
    const days = r.status === "running" ? Math.max(1, Math.ceil((new Date() - new Date(r.startDate)) / 86400000)) : (r.totalDays || 0);
    return sum + toEUR(r.dailyRate * days, r.currency, rates);
  }, 0);
  const totalCost = totalItems + totalRunning;
  const quoted = s.costs?.quoted || 0;
  return { quoted, totalCost, margin: quoted - totalCost, marginPct: quoted > 0 ? ((quoted - totalCost) / quoted * 100) : 0 };
}

export function exportFinancials({ shipments, projects, rates, mode = "profit_loss", groupBy = "shipment" }) {
  const wb = XLSX.utils.book_new();

  if (groupBy === "project") {
    // One sheet per project + loose shipments
    const groups = [
      ...projects.map(p => ({ name: p.name, customer: p.customer, shipments: shipments.filter(s => s.projectId === p.id) })),
      { name: "Loose Shipments", customer: "—", shipments: shipments.filter(s => !s.projectId) },
    ].filter(g => g.shipments.length > 0);

    groups.forEach(group => {
      const rows = buildRows(group.shipments, rates, mode);
      const ws = XLSX.utils.aoa_to_sheet(rows);
      setColumnWidths(ws, mode);
      XLSX.utils.book_append_sheet(wb, ws, group.name.slice(0, 31));
    });

    // Summary sheet
    const summaryRows = [["Project", "Customer", "Shipments", "Total Quoted (EUR)", "Total Costs (EUR)", "Total Margin (EUR)", "Margin %"]];
    groups.forEach(g => {
      const totals = g.shipments.reduce((a, s) => {
        const f = calcShipmentFinancials(s, rates);
        return { quoted: a.quoted + f.quoted, cost: a.cost + f.totalCost, margin: a.margin + f.margin };
      }, { quoted: 0, cost: 0, margin: 0 });
      summaryRows.push([g.name, g.customer, g.shipments.length, round(totals.quoted), round(totals.cost), round(totals.margin), totals.quoted > 0 ? round(totals.margin / totals.quoted * 100) + "%" : "—"]);
    });
    const grandTotal = shipments.reduce((a, s) => { const f = calcShipmentFinancials(s, rates); return { q: a.q + f.quoted, c: a.c + f.totalCost, m: a.m + f.margin }; }, { q: 0, c: 0, m: 0 });
    summaryRows.push([]);
    summaryRows.push(["TOTAL", "", shipments.length, round(grandTotal.q), round(grandTotal.c), round(grandTotal.m), grandTotal.q > 0 ? round(grandTotal.m / grandTotal.q * 100) + "%" : "—"]);
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  } else {
    const rows = buildRows(shipments, rates, mode);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    setColumnWidths(ws, mode);
    XLSX.utils.book_append_sheet(wb, ws, "Financials");
  }

  const filename = `CargoDesk_Financials_${mode}_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}

function buildRows(shipments, rates, mode) {
  const rows = [];

  if (mode === "profit_loss") {
    rows.push(["Reference", "Customer Ref", "Origin", "Destination", "Carrier", "Status", "Quoted (EUR)", "Costs (EUR)", "Margin (EUR)", "Margin %"]);
    shipments.forEach(s => {
      const f = calcShipmentFinancials(s, rates);
      rows.push([s.ref || "Pending", s.customerRef || "", s.origin, s.destination, s.carrier, s.status, round(f.quoted), round(f.totalCost), round(f.margin), round(f.marginPct) + "%"]);
    });
    // Cost breakdown per shipment
    rows.push([]);
    rows.push(["--- COST BREAKDOWN ---"]);
    shipments.forEach(s => {
      if ((s.costs?.items || []).length === 0 && (s.costs?.running || []).length === 0) return;
      rows.push([]);
      rows.push([`${s.ref || "Pending"}: ${s.origin} → ${s.destination}`]);
      rows.push(["Category", "Description", "Amount", "Currency", "Amount (EUR)"]);
      (s.costs?.items || []).forEach(c => {
        rows.push([c.category, c.desc, c.amount, c.currency, round(toEUR(c.amount, c.currency, rates))]);
      });
      (s.costs?.running || []).forEach(r => {
        const days = r.status === "running" ? Math.max(1, Math.ceil((new Date() - new Date(r.startDate)) / 86400000)) : (r.totalDays || 0);
        rows.push(["running", `${r.desc} (${days} days × ${r.dailyRate}/day)`, days * r.dailyRate, r.currency, round(toEUR(r.dailyRate * days, r.currency, rates))]);
      });
    });

  } else if (mode === "profit_only") {
    rows.push(["Reference", "Customer Ref", "Route", "Carrier", "Quoted (EUR)", "Margin (EUR)", "Margin %"]);
    shipments.forEach(s => {
      const f = calcShipmentFinancials(s, rates);
      rows.push([s.ref || "Pending", s.customerRef || "", `${s.origin} → ${s.destination}`, s.carrier, round(f.quoted), round(f.margin), round(f.marginPct) + "%"]);
    });

  } else if (mode === "costs_only") {
    rows.push(["Reference", "Route", "Carrier", "Category", "Description", "Amount", "Currency", "Amount (EUR)"]);
    shipments.forEach(s => {
      (s.costs?.items || []).forEach(c => {
        rows.push([s.ref || "Pending", `${s.origin} → ${s.destination}`, s.carrier, c.category, c.desc, c.amount, c.currency, round(toEUR(c.amount, c.currency, rates))]);
      });
      (s.costs?.running || []).forEach(r => {
        const days = r.status === "running" ? Math.max(1, Math.ceil((new Date() - new Date(r.startDate)) / 86400000)) : (r.totalDays || 0);
        rows.push([s.ref || "Pending", `${s.origin} → ${s.destination}`, s.carrier, "running", `${r.desc} (${days}d)`, days * r.dailyRate, r.currency, round(toEUR(r.dailyRate * days, r.currency, rates))]);
      });
    });
  }

  // Totals
  const grand = shipments.reduce((a, s) => { const f = calcShipmentFinancials(s, rates); return { q: a.q + f.quoted, c: a.c + f.totalCost, m: a.m + f.margin }; }, { q: 0, c: 0, m: 0 });
  rows.push([]);
  if (mode === "costs_only") {
    rows.push(["TOTAL", "", "", "", "", "", "", round(grand.c)]);
  } else {
    rows.push(["TOTAL", "", "", "", round(grand.q), round(grand.c), round(grand.m), grand.q > 0 ? round(grand.m / grand.q * 100) + "%" : ""]);
  }

  return rows;
}

function setColumnWidths(ws, mode) {
  ws["!cols"] = Array(12).fill({ wch: 16 });
  if (ws["!cols"][0]) ws["!cols"][0] = { wch: 18 };
}

function round(n) { return Math.round(n * 100) / 100; }
