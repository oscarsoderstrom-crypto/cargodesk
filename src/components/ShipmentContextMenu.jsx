import { useState, useEffect, useRef } from "react";
import { Trash2, Copy, ArrowRight } from "lucide-react";

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
      // Don't close if clicking inside the menu or its sub-menus
      if (ref.current && ref.current.contains(e.target)) return;
      onClose();
    };
    // Use timeout to prevent the opening right-click from immediately closing
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 50);
    return () => { clearTimeout(timer); document.removeEventListener("mousedown", handler); };
  }, [onClose]);

  // Adjust position to keep on screen
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 250);

  return (
    <div ref={ref} style={{
      position: "fixed", left: adjustedX, top: adjustedY, zIndex: 300,
      minWidth: 200, background: T.bg3, border: `1px solid ${T.border2}`,
      borderRadius: 10, boxShadow: `0 12px 40px ${T.shadowHeavy}`, overflow: "visible",
    }}>
      {/* Status change */}
      <div style={{ position: "relative" }}
        onMouseEnter={() => setShowStatus(true)} onMouseLeave={() => setShowStatus(false)}>
        <div style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
          padding: "10px 14px", fontSize: 13, fontWeight: 500, color: T.text1,
          cursor: "pointer", borderBottom: `1px solid ${T.border0}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ArrowRight size={14} /> Change Status
          </div>
          <ArrowRight size={12} color={T.text3} />
        </div>
        {showStatus && (
          <div style={{
            position: "absolute", left: "100%", top: -1, marginLeft: 2,
            minWidth: 160, background: T.bg3, border: `1px solid ${T.border2}`,
            borderRadius: 8, boxShadow: `0 8px 24px ${T.shadowHeavy}`, overflow: "hidden",
          }}>
            {STATUS_FLOW.map((s, i) => (
              <div key={s.id}
                onClick={(e) => { e.stopPropagation(); onStatusChange(shipment.id, s.id); onClose(); }}
                style={{
                  padding: "9px 14px", fontSize: 13, fontWeight: shipment.status === s.id ? 600 : 400,
                  color: shipment.status === s.id ? T.accent : T.text1,
                  background: shipment.status === s.id ? T.accentGlow : "transparent",
                  cursor: shipment.status === s.id ? "default" : "pointer",
                  borderBottom: i < STATUS_FLOW.length - 1 ? `1px solid ${T.border0}` : "none",
                }}
                onMouseEnter={e => { if (shipment.status !== s.id) e.currentTarget.style.background = T.bg4; }}
                onMouseLeave={e => { if (shipment.status !== s.id) e.currentTarget.style.background = "transparent"; }}>
                {shipment.status === s.id ? `● ${s.label}` : s.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Duplicate */}
      <div onClick={() => { onDuplicate(shipment); onClose(); }}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", fontSize: 13, fontWeight: 500, color: T.text1,
          cursor: "pointer", borderBottom: `1px solid ${T.border0}`,
        }}
        onMouseEnter={e => e.currentTarget.style.background = T.bg4}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
        <Copy size={14} /> Duplicate Shipment
      </div>

      {/* Delete */}
      {!confirmDelete ? (
        <div onClick={() => setConfirmDelete(true)}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 14px", fontSize: 13, fontWeight: 500, color: T.red, cursor: "pointer",
          }}
          onMouseEnter={e => e.currentTarget.style.background = T.redBg}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <Trash2 size={14} /> Delete Shipment
        </div>
      ) : (
        <div style={{ padding: 12, background: T.redBg, borderTop: `1px solid ${T.redBorder}` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.red, marginBottom: 8 }}>Delete {shipment.ref || "this shipment"}?</div>
          <div style={{ display: "flex", gap: 6 }}>
            <div onClick={() => setConfirmDelete(false)}
              style={{ padding: "5px 12px", borderRadius: 5, fontSize: 12, color: T.text2, background: T.bg3, border: `1px solid ${T.border1}`, cursor: "pointer" }}>
              Cancel
            </div>
            <div onClick={() => { onDelete(shipment.id); onClose(); }}
              style={{ padding: "5px 12px", borderRadius: 5, fontSize: 12, fontWeight: 600, color: "white", background: T.red, cursor: "pointer" }}>
              Delete
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
