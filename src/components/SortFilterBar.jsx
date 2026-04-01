import { useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

const SORT_OPTIONS = [
  { id: "etd_asc", label: "ETD (earliest first)", field: "etd", dir: "asc" },
  { id: "etd_desc", label: "ETD (latest first)", field: "etd", dir: "desc" },
  { id: "eta_asc", label: "ETA (earliest first)", field: "eta", dir: "asc" },
  { id: "eta_desc", label: "ETA (latest first)", field: "eta", dir: "desc" },
  { id: "ref_asc", label: "Reference (A→Z)", field: "ref", dir: "asc" },
  { id: "ref_desc", label: "Reference (Z→A)", field: "ref", dir: "desc" },
  { id: "status", label: "Status", field: "status", dir: "asc" },
];

const STATUS_ORDER = { planned: 0, booked: 1, in_transit: 2, arrived: 3, delivered: 4, completed: 5 };

/**
 * Sort shipments based on a sort option.
 */
export function sortShipments(shipments, sortId) {
  const opt = SORT_OPTIONS.find(o => o.id === sortId);
  if (!opt) return shipments;

  return [...shipments].sort((a, b) => {
    let va, vb;

    if (opt.field === "status") {
      va = STATUS_ORDER[a.status] ?? 99;
      vb = STATUS_ORDER[b.status] ?? 99;
    } else if (opt.field === "etd" || opt.field === "eta") {
      va = a[opt.field] ? new Date(a[opt.field]).getTime() : (opt.dir === "asc" ? Infinity : -Infinity);
      vb = b[opt.field] ? new Date(b[opt.field]).getTime() : (opt.dir === "asc" ? Infinity : -Infinity);
    } else if (opt.field === "ref") {
      va = a.ref || "";
      vb = b.ref || "";
      return opt.dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    } else {
      va = a[opt.field] || "";
      vb = b[opt.field] || "";
    }

    return opt.dir === "asc" ? va - vb : vb - va;
  });
}

export default function SortFilterBar({ T, sortBy, onSortChange }) {
  const [open, setOpen] = useState(false);
  const current = SORT_OPTIONS.find(o => o.id === sortBy);

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 6, padding: "6px 10px",
          borderRadius: 6, fontSize: 12, fontWeight: 500,
          background: sortBy ? T.bg4 : "transparent", color: sortBy ? T.text0 : T.text3,
          border: `1px solid ${sortBy ? T.border2 : T.border0}`, cursor: "pointer",
        }}>
        <ArrowUpDown size={13} />
        {current ? current.label : "Sort"}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "100%", right: 0, marginTop: 4, minWidth: 200,
          background: T.bg3, border: `1px solid ${T.border2}`, borderRadius: 10,
          boxShadow: `0 12px 40px ${T.shadowHeavy}`, zIndex: 50, overflow: "hidden",
        }}>
          {/* Clear sort */}
          <button onClick={() => { onSortChange(null); setOpen(false); }}
            style={{
              width: "100%", padding: "10px 14px", textAlign: "left", fontSize: 13,
              color: !sortBy ? T.accent : T.text2, background: !sortBy ? T.bg4 : "transparent",
              border: "none", borderBottom: `1px solid ${T.border0}`, cursor: "pointer",
            }}
            onMouseEnter={e => e.currentTarget.style.background = T.bg4}
            onMouseLeave={e => { if (sortBy) e.currentTarget.style.background = "transparent"; }}>
            Default order
          </button>

          {SORT_OPTIONS.map((opt, i) => (
            <button key={opt.id} onClick={() => { onSortChange(opt.id); setOpen(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "10px 14px", textAlign: "left", fontSize: 13, fontWeight: 500,
                color: sortBy === opt.id ? T.accent : T.text1,
                background: sortBy === opt.id ? T.bg4 : "transparent",
                border: "none", borderBottom: i < SORT_OPTIONS.length - 1 ? `1px solid ${T.border0}` : "none",
                cursor: "pointer",
              }}
              onMouseEnter={e => e.currentTarget.style.background = T.bg4}
              onMouseLeave={e => { if (sortBy !== opt.id) e.currentTarget.style.background = "transparent"; }}>
              {opt.dir === "asc" ? <ArrowUp size={12} /> : opt.dir === "desc" ? <ArrowDown size={12} /> : <ArrowUpDown size={12} />}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { SORT_OPTIONS };
