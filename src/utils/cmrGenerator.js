/**
 * CMR (Convention on the Contract for the International Carriage of Goods by Road)
 * Document generator.
 *
 * Generates a printable CMR form as an HTML document that opens in a new tab
 * for printing/saving as PDF via the browser's built-in print dialog.
 */

export function generateCMR(shipment, project) {
  const now = new Date().toLocaleDateString("fi-FI", { day: "numeric", month: "long", year: "numeric" });

  // Find trucking legs from routing
  const routing = shipment.routing || `${shipment.origin || ""} → ${shipment.destination || ""}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>CMR - ${shipment.ref || "Draft"}</title>
<style>
  @page { size: A4; margin: 10mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; line-height: 1.4; color: #000; background: #fff; }
  .cmr-container { width: 190mm; margin: 0 auto; border: 2px solid #000; }
  .cmr-header { display: flex; border-bottom: 2px solid #000; }
  .cmr-header-left { flex: 1; padding: 6px 8px; border-right: 1px solid #000; }
  .cmr-header-right { width: 80mm; padding: 6px 8px; text-align: center; }
  .cmr-title { font-size: 22px; font-weight: bold; letter-spacing: 3px; }
  .cmr-subtitle { font-size: 8px; color: #555; margin-top: 2px; }
  .cmr-row { display: flex; border-bottom: 1px solid #000; }
  .cmr-row:last-child { border-bottom: none; }
  .cmr-cell { padding: 4px 6px; border-right: 1px solid #000; min-height: 28mm; }
  .cmr-cell:last-child { border-right: none; }
  .cmr-cell-half { width: 50%; }
  .cmr-cell-third { width: 33.33%; }
  .cmr-cell-full { width: 100%; }
  .cmr-cell-quarter { width: 25%; }
  .cmr-label { font-size: 7px; font-weight: bold; text-transform: uppercase; color: #555; margin-bottom: 2px; }
  .cmr-box-num { position: absolute; top: 2px; right: 4px; font-size: 14px; font-weight: bold; color: #ccc; }
  .cmr-cell { position: relative; }
  .cmr-value { font-size: 11px; margin-top: 2px; }
  .cmr-value-large { font-size: 13px; font-weight: bold; }
  .cmr-section-title { background: #f0f0f0; padding: 3px 6px; font-size: 8px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000; letter-spacing: 1px; }
  .cmr-footer { padding: 6px 8px; font-size: 7px; color: #888; text-align: center; border-top: 1px solid #000; }
  .cmr-signatures { display: flex; border-top: 2px solid #000; }
  .cmr-sig { flex: 1; padding: 6px 8px; border-right: 1px solid #000; min-height: 25mm; }
  .cmr-sig:last-child { border-right: none; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none; }
  }
</style>
</head>
<body>

<div class="no-print" style="padding: 12px; background: #2563EB; color: white; text-align: center; font-size: 14px; font-family: sans-serif;">
  <strong>CMR Document — ${shipment.ref || "Draft"}</strong> &nbsp;|&nbsp; Press Ctrl+P to print or save as PDF
</div>

<div class="cmr-container">
  <!-- Header -->
  <div class="cmr-header">
    <div class="cmr-header-left">
      <div class="cmr-label">International Consignment Note</div>
      <div class="cmr-title">CMR</div>
      <div class="cmr-subtitle">Convention on the Contract for the International Carriage of Goods by Road (CMR)</div>
    </div>
    <div class="cmr-header-right">
      <div class="cmr-label">Consignment Note No.</div>
      <div class="cmr-value-large" style="margin-top: 8px;">${shipment.ref || "________________"}</div>
      <div style="margin-top: 4px; font-size: 8px; color: #888;">Date: ${now}</div>
    </div>
  </div>

  <!-- Box 1: Sender -->
  <div class="cmr-row">
    <div class="cmr-cell cmr-cell-full" style="min-height: 20mm;">
      <span class="cmr-box-num">1</span>
      <div class="cmr-label">Sender (Name, Address, Country)</div>
      <div class="cmr-value">${project ? project.customer : ""}</div>
    </div>
  </div>

  <!-- Box 2: Consignee -->
  <div class="cmr-row">
    <div class="cmr-cell cmr-cell-full" style="min-height: 20mm;">
      <span class="cmr-box-num">2</span>
      <div class="cmr-label">Consignee (Name, Address, Country)</div>
      <div class="cmr-value"></div>
    </div>
  </div>

  <!-- Box 3: Place of delivery / Box 4: Place & date of taking over -->
  <div class="cmr-row">
    <div class="cmr-cell cmr-cell-half" style="min-height: 16mm;">
      <span class="cmr-box-num">3</span>
      <div class="cmr-label">Place of Delivery of Goods</div>
      <div class="cmr-value">${shipment.destination || ""}</div>
    </div>
    <div class="cmr-cell cmr-cell-half" style="min-height: 16mm;">
      <span class="cmr-box-num">4</span>
      <div class="cmr-label">Place and Date of Taking Over Goods</div>
      <div class="cmr-value">${shipment.origin || ""}</div>
      <div class="cmr-value" style="margin-top: 2px; color: #888;">${shipment.etd ? new Date(shipment.etd).toLocaleDateString("fi-FI") : ""}</div>
    </div>
  </div>

  <!-- Box 5: Documents attached -->
  <div class="cmr-row">
    <div class="cmr-cell cmr-cell-full" style="min-height: 12mm;">
      <span class="cmr-box-num">5</span>
      <div class="cmr-label">Documents Attached</div>
      <div class="cmr-value"></div>
    </div>
  </div>

  <!-- Goods description section -->
  <div class="cmr-section-title">Description of Goods</div>

  <!-- Box 6-12: Marks, Packages, Nature, Weight, Volume -->
  <div class="cmr-row">
    <div class="cmr-cell" style="width: 15%; min-height: 30mm;">
      <span class="cmr-box-num">6</span>
      <div class="cmr-label">Marks & Nos.</div>
      <div class="cmr-value">${shipment.ref || ""}</div>
      <div class="cmr-value">${shipment.customerRef || ""}</div>
    </div>
    <div class="cmr-cell" style="width: 15%;">
      <span class="cmr-box-num">7</span>
      <div class="cmr-label">No. of Packages</div>
      <div class="cmr-value"></div>
    </div>
    <div class="cmr-cell" style="width: 25%;">
      <span class="cmr-box-num">8</span>
      <div class="cmr-label">Method of Packing</div>
      <div class="cmr-value">${shipment.containerType || ""}</div>
    </div>
    <div class="cmr-cell" style="width: 25%;">
      <span class="cmr-box-num">9</span>
      <div class="cmr-label">Nature of Goods</div>
      <div class="cmr-value"></div>
    </div>
    <div class="cmr-cell" style="width: 10%;">
      <span class="cmr-box-num">10</span>
      <div class="cmr-label">Stat. No.</div>
    </div>
    <div class="cmr-cell" style="width: 10%;">
      <span class="cmr-box-num">11</span>
      <div class="cmr-label">Gross Weight kg</div>
    </div>
  </div>

  <!-- Box 12: Volume -->
  <div class="cmr-row">
    <div class="cmr-cell cmr-cell-full" style="min-height: 8mm;">
      <span class="cmr-box-num">12</span>
      <div class="cmr-label">Volume m³</div>
    </div>
  </div>

  <!-- Box 13: Sender's instructions -->
  <div class="cmr-row">
    <div class="cmr-cell cmr-cell-full" style="min-height: 16mm;">
      <span class="cmr-box-num">13</span>
      <div class="cmr-label">Sender's Instructions (Customs, etc.)</div>
    </div>
  </div>

  <!-- Carrier section -->
  <div class="cmr-section-title">Carrier Details</div>

  <!-- Box 16: Carrier / Box 17: Successive carriers -->
  <div class="cmr-row">
    <div class="cmr-cell cmr-cell-half" style="min-height: 18mm;">
      <span class="cmr-box-num">16</span>
      <div class="cmr-label">Carrier (Name, Address, Country)</div>
      <div class="cmr-value">${shipment.carrier || ""}</div>
    </div>
    <div class="cmr-cell cmr-cell-half" style="min-height: 18mm;">
      <span class="cmr-box-num">17</span>
      <div class="cmr-label">Successive Carriers</div>
    </div>
  </div>

  <!-- Box 18: Reservations -->
  <div class="cmr-row">
    <div class="cmr-cell cmr-cell-full" style="min-height: 14mm;">
      <span class="cmr-box-num">18</span>
      <div class="cmr-label">Carrier's Reservations and Observations</div>
    </div>
  </div>

  <!-- Box 19-21: Special agreements, payment -->
  <div class="cmr-row">
    <div class="cmr-cell cmr-cell-half" style="min-height: 14mm;">
      <span class="cmr-box-num">19</span>
      <div class="cmr-label">Special Agreements</div>
      <div class="cmr-value" style="font-size: 9px;">Routing: ${routing}</div>
    </div>
    <div class="cmr-cell cmr-cell-half" style="min-height: 14mm;">
      <span class="cmr-box-num">20</span>
      <div class="cmr-label">To Be Paid By</div>
      <div class="cmr-row" style="border: none; margin-top: 4px;">
        <div style="width: 50%; font-size: 9px;">Sender ☐</div>
        <div style="width: 50%; font-size: 9px;">Consignee ☐</div>
      </div>
    </div>
  </div>

  <!-- Signatures -->
  <div class="cmr-section-title">Signatures</div>
  <div class="cmr-signatures">
    <div class="cmr-sig">
      <span class="cmr-box-num">22</span>
      <div class="cmr-label">Established in</div>
      <div class="cmr-value">${shipment.origin || ""}, ${now}</div>
    </div>
    <div class="cmr-sig">
      <span class="cmr-box-num">23</span>
      <div class="cmr-label">Signature & Stamp of Sender</div>
    </div>
    <div class="cmr-sig">
      <span class="cmr-box-num">24</span>
      <div class="cmr-label">Signature & Stamp of Carrier</div>
    </div>
  </div>

  <div class="cmr-footer">
    Generated by CargoDesk — ${now} — ${shipment.ref || "Draft"} — ${routing}
  </div>
</div>

</body>
</html>`;

  // Open in new tab for printing
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
  return true;
}

/**
 * Check if a shipment has a trucking leg.
 */
export function hasTruckingLeg(shipment) {
  if (shipment.mode === "truck") return true;
  const routing = (shipment.routing || "").toLowerCase();
  return routing.includes("truck") || routing.includes("road") || routing.includes("ftl") || routing.includes("ltl");
}
