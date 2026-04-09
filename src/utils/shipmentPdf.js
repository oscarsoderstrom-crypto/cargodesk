/**
 * Shipment summary PDF generator.
 * Creates a formatted printable summary of a single shipment.
 */

export function generateShipmentSummary(shipment, project, costs) {
  const now = new Date().toLocaleDateString("fi-FI", { day: "numeric", month: "long", year: "numeric" });
  const fmtDate = d => d ? new Date(d).toLocaleDateString("fi-FI", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const fmtEUR = v => new Intl.NumberFormat("fi-FI", { style: "currency", currency: "EUR" }).format(v);

  const milestones = (shipment.milestones || []).map(m =>
    `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee;">${m.done ? "✓" : "○"}</td>
     <td style="padding:6px 10px;border-bottom:1px solid #eee;${m.done ? "color:#999;text-decoration:line-through;" : ""}">${m.label}</td>
     <td style="padding:6px 10px;border-bottom:1px solid #eee;color:#666;">${m.date ? fmtDate(m.date) : "TBD"}</td></tr>`
  ).join("");

  const costRows = (shipment.costs?.items || []).map(c =>
    `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee;text-transform:capitalize;">${c.category}</td>
     <td style="padding:6px 10px;border-bottom:1px solid #eee;">${c.desc}</td>
     <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;">${c.currency} ${c.amount.toLocaleString("fi-FI")}</td></tr>`
  ).join("");

  const runningRows = (shipment.costs?.running || []).map(r => {
    const days = r.status === "running" ? Math.max(1, Math.ceil((new Date() - new Date(r.startDate)) / 86400000)) : (r.totalDays || 0);
    return `<tr style="background:#FFF5F5;"><td style="padding:6px 10px;border-bottom:1px solid #eee;">Running</td>
     <td style="padding:6px 10px;border-bottom:1px solid #eee;">${r.desc} (${days} days × ${r.currency} ${r.dailyRate}/day) — ${r.status.toUpperCase()}</td>
     <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;">${r.currency} ${(days * r.dailyRate).toLocaleString("fi-FI")}</td></tr>`;
  }).join("");

  const totalCost = costs?.totalCost || 0;
  const quoted = shipment.costs?.quoted || 0;
  const margin = quoted - totalCost;

  const notes = (shipment.notes || []).map(n =>
    `<div style="padding:8px 0;border-bottom:1px solid #f0f0f0;">
      <div style="font-size:11px;color:#999;">${new Date(n.timestamp).toLocaleString("fi-FI")}</div>
      <div style="margin-top:2px;">${n.text}</div>
    </div>`
  ).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Shipment Summary - ${shipment.ref || "Draft"}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, Arial, sans-serif; font-size: 12px; line-height: 1.5; color: #333; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 2px solid #2563EB; margin-bottom: 20px; }
  .ref { font-size: 24px; font-weight: bold; font-family: monospace; color: #111; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #eee; }
  table { width: 100%; border-collapse: collapse; }
  .detail-row { display: flex; padding: 6px 0; border-bottom: 1px solid #f5f5f5; }
  .detail-label { width: 160px; color: #888; font-size: 12px; }
  .detail-value { flex: 1; font-weight: 500; }
  .financial-cards { display: flex; gap: 12px; margin-bottom: 16px; }
  .fin-card { flex: 1; padding: 12px; border: 1px solid #eee; border-radius: 8px; text-align: center; }
  .fin-card-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #999; }
  .fin-card-value { font-size: 18px; font-weight: bold; font-family: monospace; margin-top: 4px; }
  .positive { color: #059669; }
  .negative { color: #DC2626; }
  .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #eee; font-size: 10px; color: #bbb; text-align: center; }
  @media print { .no-print { display: none; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>

<div class="no-print" style="padding:10px;background:#2563EB;color:white;text-align:center;font-size:13px;font-family:sans-serif;">
  <strong>Shipment Summary</strong> — Press Ctrl+P to print or save as PDF
</div>

<div class="header">
  <div>
    <div class="ref">${shipment.ref || "Ref Pending"}</div>
    ${project ? `<div style="font-size:13px;color:#666;margin-top:4px;">Project: <strong>${project.name}</strong> — ${project.customer}${shipment.customerRef ? ` • ${shipment.customerRef}` : ""}</div>` : ""}
    <div style="margin-top:8px;font-size:14px;"><strong>${shipment.origin}</strong> → <strong>${shipment.destination}</strong></div>
  </div>
  <div style="text-align:right;">
    <span class="badge">${(shipment.status || "").replace("_", " ").toUpperCase()}</span>
    <div style="margin-top:8px;font-size:11px;color:#999;">Generated ${now}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Transport Details</div>
  ${[
    ["Mode", (shipment.mode || "").charAt(0).toUpperCase() + (shipment.mode || "").slice(1)],
    ["Carrier", shipment.carrier || "—"],
    ["Vessel / Vehicle", shipment.vessel || "—"],
    ["Voyage", shipment.voyage || "—"],
    ["Routing", shipment.routing || "—"],
    ["Container / Cargo", shipment.containerType || "—"],
    ["ETD", fmtDate(shipment.etd)],
    ["ETA", fmtDate(shipment.eta)],
  ].map(([l, v]) => `<div class="detail-row"><div class="detail-label">${l}</div><div class="detail-value">${v}</div></div>`).join("")}
</div>

<div class="section">
  <div class="section-title">Milestones</div>
  <table>${milestones || '<tr><td style="padding:8px;color:#999;">No milestones defined</td></tr>'}</table>
</div>

<div class="section">
  <div class="section-title">Financial Summary</div>
  <div class="financial-cards">
    <div class="fin-card"><div class="fin-card-label">Quoted</div><div class="fin-card-value" style="color:#2563EB;">${fmtEUR(quoted)}</div></div>
    <div class="fin-card"><div class="fin-card-label">Costs</div><div class="fin-card-value">${fmtEUR(totalCost)}</div></div>
    <div class="fin-card"><div class="fin-card-label">Margin</div><div class="fin-card-value ${margin >= 0 ? "positive" : "negative"}">${fmtEUR(margin)}</div></div>
  </div>
  ${(costRows || runningRows) ? `<table><thead><tr style="background:#f9f9f9;"><th style="padding:6px 10px;text-align:left;font-size:11px;color:#999;">Category</th><th style="padding:6px 10px;text-align:left;font-size:11px;color:#999;">Description</th><th style="padding:6px 10px;text-align:right;font-size:11px;color:#999;">Amount</th></tr></thead><tbody>${costRows}${runningRows}</tbody></table>` : ""}
</div>

${notes ? `<div class="section"><div class="section-title">Notes</div>${notes}</div>` : ""}

${shipment.co2e && shipment.co2e.kg > 0 ? `<div class="section"><div class="section-title">Environmental</div><div style="padding:8px 12px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:6px;display:inline-block;"><strong style="color:#059669;">${shipment.co2e.kg >= 1000 ? (shipment.co2e.kg / 1000).toFixed(2) + " t" : shipment.co2e.kg + " kg"} CO₂e</strong><span style="color:#888;margin-left:8px;">estimated emissions</span></div></div>` : ""}

<div class="footer">CargoDesk — Shipment Summary — ${shipment.ref || "Draft"} — Generated ${now}</div>

</body></html>`;

  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); }
}
