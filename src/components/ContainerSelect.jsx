import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { getContainerTypesForMode, formatContainer } from "../utils/containers.js";

export default function ContainerSelect({ T, mode, containerType, containerCount, onTypeChange, onCountChange }) {
  const types = getContainerTypesForMode(mode);
  const [showTypes, setShowTypes] = useState(false);
  const selType = types.find(t => t.id === containerType);

  const inputStyle = {
    padding: "10px 12px", borderRadius: 8, fontSize: 14,
    border: `1px solid ${T.border1}`, background: T.bg3, color: T.text0, outline: "none",
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 8 }}>
      {/* Type selector */}
      <div style={{ position: "relative" }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 6 }}>Container / Cargo Type</label>
        <button onClick={() => setShowTypes(!showTypes)} type="button"
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            ...inputStyle, cursor: "pointer", textAlign: "left",
            borderColor: showTypes ? T.accent : T.border1,
          }}>
          <span>{selType ? `${selType.label} — ${selType.desc}` : "Select type..."}</span>
          <ChevronDown size={16} color={T.text3} />
        </button>

        {showTypes && (
          <div style={{
            position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4,
            background: T.bg3, border: `1px solid ${T.border2}`, borderRadius: 10,
            boxShadow: `0 12px 40px ${T.shadowHeavy}`, zIndex: 50, maxHeight: 300, overflowY: "auto",
          }}>
            {types.map((t, i) => (
              <button key={t.id}
                onMouseDown={(e) => { e.preventDefault(); onTypeChange(t.id); setShowTypes(false); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", background: containerType === t.id ? T.bg4 : "transparent",
                  border: "none", borderBottom: i < types.length - 1 ? `1px solid ${T.border0}` : "none",
                  cursor: "pointer", textAlign: "left",
                }}
                onMouseEnter={e => e.currentTarget.style.background = T.bg4}
                onMouseLeave={e => { if (containerType !== t.id) e.currentTarget.style.background = "transparent"; }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: T.text0 }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: T.text3 }}>{t.desc}</div>
                </div>
                {t.teu > 0 && <span style={{ fontSize: 11, color: T.text3, fontFamily: "'JetBrains Mono',monospace" }}>{t.teu} TEU</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quantity */}
      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 6 }}>Qty</label>
        <input
          type="number" min="1" max="999"
          value={containerCount}
          onChange={e => onCountChange(parseInt(e.target.value) || 1)}
          style={{ ...inputStyle, width: "100%" }}
        />
      </div>
    </div>
  );
}
