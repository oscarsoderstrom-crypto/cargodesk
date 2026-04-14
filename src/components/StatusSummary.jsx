// StatusSummary.jsx — Compact status pill strip
// Replaces the large card grid. Single row of clickable pills showing count per status.
// Props: T, shipments, statusCfg, onFilterClick, activeFilter

export default function StatusSummary({ T, shipments, statusCfg, onFilterClick, activeFilter = "all" }) {
  const statuses = ["planned", "booked", "in_transit", "arrived", "delivered", "completed"];

  const counts = {};
  for (const s of statuses) {
    counts[s] = shipments.filter(sh => sh.status === s).length;
  }
  const total = shipments.length;

  // Only show statuses that have at least one shipment, plus "all"
  const activeStatuses = statuses.filter(s => counts[s] > 0);

  if (activeStatuses.length === 0) return null;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
      marginBottom: 16,
    }}>
      {/* All pill */}
      <button
        onClick={() => onFilterClick("all")}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "4px 10px", borderRadius: 20,
          fontSize: 12, fontWeight: 600,
          cursor: "pointer", border: "none",
          background: activeFilter === "all" ? T.accent : T.bg3,
          color: activeFilter === "all" ? "white" : T.text2,
          transition: "all 0.15s",
        }}
        onMouseEnter={e => { if (activeFilter !== "all") { e.currentTarget.style.background = T.bg4; e.currentTarget.style.color = T.text1; } }}
        onMouseLeave={e => { if (activeFilter !== "all") { e.currentTarget.style.background = T.bg3; e.currentTarget.style.color = T.text2; } }}
      >
        All <span style={{ opacity: 0.75 }}>{total}</span>
      </button>

      {/* Divider */}
      <div style={{ width: 1, height: 16, background: T.border1 }} />

      {/* Per-status pills */}
      {activeStatuses.map(s => {
        const cfg = statusCfg[s];
        if (!cfg) return null;
        const isActive = activeFilter === s;
        return (
          <button
            key={s}
            onClick={() => onFilterClick(s)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 20,
              fontSize: 12, fontWeight: 600,
              cursor: "pointer",
              background: isActive ? cfg.color : T.bg3,
              color: isActive ? "white" : cfg.color,
              border: `1px solid ${isActive ? cfg.color : cfg.ring}`,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = cfg.bg; } }}
            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = T.bg3; } }}
          >
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: isActive ? "white" : cfg.color,
              display: "inline-block", flexShrink: 0,
            }} />
            {cfg.label}
            <span style={{ opacity: 0.8 }}>{counts[s]}</span>
          </button>
        );
      })}
    </div>
  );
}
