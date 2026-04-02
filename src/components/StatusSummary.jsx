import { Ship, Plane, Truck, Package } from "lucide-react";

export default function StatusSummary({ T, shipments, statusCfg, onFilterClick }) {
  const counts = {
    planned: shipments.filter(s => s.status === "planned").length,
    booked: shipments.filter(s => s.status === "booked").length,
    in_transit: shipments.filter(s => s.status === "in_transit").length,
    arrived: shipments.filter(s => s.status === "arrived").length,
    delivered: shipments.filter(s => s.status === "delivered").length,
  };

  const total = shipments.length;
  const active = total - counts.delivered;

  const cards = [
    { key: "all", label: "Total", count: total, color: T.text0, bg: T.bg2, border: T.border1 },
    { key: "planned", label: "Planned", count: counts.planned, ...styleFor("planned") },
    { key: "booked", label: "Booked", count: counts.booked, ...styleFor("booked") },
    { key: "in_transit", label: "In Transit", count: counts.in_transit, ...styleFor("in_transit") },
    { key: "arrived", label: "Arrived", count: counts.arrived, ...styleFor("arrived") },
    { key: "delivered", label: "Delivered", count: counts.delivered, ...styleFor("delivered") },
  ];

  function styleFor(status) {
    const cfg = statusCfg[status];
    return { color: cfg.color, bg: cfg.bg, border: cfg.ring };
  }

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
      {cards.map(c => (
        <button key={c.key} onClick={() => onFilterClick(c.key === "all" ? "all" : c.key)}
          style={{
            flex: 1, padding: "12px 14px", borderRadius: 10, textAlign: "center", cursor: "pointer",
            background: c.bg, border: `1px solid ${c.border}`, transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 4px 12px ${T.shadow}`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: c.color, fontFamily: "'JetBrains Mono',monospace" }}>{c.count}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: c.color, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2, opacity: 0.8 }}>{c.label}</div>
        </button>
      ))}
    </div>
  );
}
