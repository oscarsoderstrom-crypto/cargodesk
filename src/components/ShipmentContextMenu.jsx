import { useState, useEffect, useRef } from "react";
import { Trash2, Copy, ArrowRight, FileText } from "lucide-react";

const STATUS_FLOW = [
  { id: "planned", label: "Planned" },
  { id: "booked", label: "Booked" },
  { id: "in_transit", label: "In Transit" },
  { id: "arrived", label: "Arrived" },
  { id: "delivered", label: "Delivered" },
  { id: "completed", label: "Completed" },
];

export default function ShipmentContextMenu({ T, x, y, shipment, onClose, onStatusChange, onDelete, onDuplicate }) {
  const ref = useRef(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Adjust position if menu would go off screen
  const menuStyle = {
    position: "fixed", left: x, top: y, zIndex: 300,
    minWidth: 200, background: T.bg3, border: `1px solid ${T.border2}`,
    borderRadius: 10, boxShadow: `0 12px 40px ${T.shadowHeavy}`,
    overflow: "hidden",
  };

  const itemStyle = (hover = false) => ({
    width: "100%", display: "flex", alignItems: "center", gap: 10,
    padding: "10px 14px", fontSize: 13, fontWeight: 500,
    color: T.text1, background: hover ? T.bg4 : "transparent",
    border: "none", cursor: "pointer", textAlign: "left",
    borderBottom: `1px solid ${T.border0}`,
  });

  return (
    <div ref={ref} style={menuStyle}>
      {/* Quick status change */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setShowStatus(!showStatus)}
          style={itemStyle()}
          onMouseEnter={e => e.currentTarget.style.background = T.bg4}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <ArrowRight size={14} /> Change Status
        </button>
        {showStatus && (
          <div style={{
            position: "absolute", left: "100%", top: 0, marginLeft: 4,
            minWidth: 160, background: T.bg3, border: `1px solid ${T.border2}`,
            borderRadius: 8, boxShadow: `0 8px 24px ${T.shadowHeavy}`, overflow: "hidden",
          }}>
            {STATUS_FLOW.map((s, i) => (
              <button key={s.id}
                onClick={() => { onStatusChange(shipment.id, s.id); onClose(); }}
                style={{
                  width: "100%", padding: "8px 14px", fontSize: 13, fontWeight: 500,
                  color: shipment.status === s.id ? T.accent : T.text1,
                  background: shipment.status === s.id ? T.accentGlow : "transparent",
                  border: "none", borderBottom: i < STATUS_FLOW.length - 1 ? `1px solid ${T.border0}` : "none",
                  cursor: shipment.status === s.id ? "default" : "pointer", textAlign: "left",
                }}
                onMouseEnter={e => { if (shipment.status !== s.id) e.currentTarget.style.background = T.bg4; }}
                onMouseLeave={e => { if (shipment.status !== s.id) e.currentTarget.style.background = "transparent"; }}>
                {shipment.status === s.id ? `● ${s.label}` : s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Duplicate */}
      <button onClick={() => { onDuplicate(shipment); onClose(); }}
        style={itemStyle()}
        onMouseEnter={e => e.currentTarget.style.background = T.bg4}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
        <Copy size={14} /> Duplicate Shipment
      </button>

      {/* Delete */}
      {!confirmDelete ? (
        <button onClick={() => setConfirmDelete(true)}
          style={{ ...itemStyle(), color: T.red, borderBottom: "none" }}
          onMouseEnter={e => { e.currentTarget.style.background = T.redBg; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
          <Trash2 size={14} /> Delete Shipment
        </button>
      ) : (
        <div style={{ padding: 12, background: T.redBg, borderTop: `1px solid ${T.redBorder}` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.red, marginBottom: 8 }}>Delete {shipment.ref || "this shipment"}?</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setConfirmDelete(false)}
              style={{ padding: "5px 12px", borderRadius: 5, fontSize: 12, color: T.text2, background: T.bg3, border: `1px solid ${T.border1}`, cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={() => { onDelete(shipment.id); onClose(); }}
              style={{ padding: "5px 12px", borderRadius: 5, fontSize: 12, fontWeight: 600, color: "white", background: T.red, border: "none", cursor: "pointer" }}>
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
