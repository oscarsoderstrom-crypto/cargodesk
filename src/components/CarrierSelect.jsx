import { useState, useRef, useEffect } from "react";
import { Ship, Plane, Truck } from "lucide-react";
import { searchCarriers } from "../utils/carriers.js";

const MODE_ICONS = { ocean: Ship, air: Plane, truck: Truck };
const TIER_LABELS = { major: "Major", regional: "Regional", local: "Local" };
const TIER_COLORS_DARK = { major: "#3B82F6", regional: "#8494B0", local: "#4F5E78" };

export default function CarrierSelect({ T, value, mode, onChange, label }) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const wrapRef = useRef(null);

  useEffect(() => { setQuery(value || ""); }, [value]);

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleInput = (val) => {
    setQuery(val);
    const matches = searchCarriers(val, mode, 12);
    setResults(matches);
    setOpen(matches.length > 0);
    setHighlighted(-1);
    if (!val) onChange("");
  };

  const handleSelect = (carrier) => {
    setQuery(carrier.name);
    setOpen(false);
    onChange(carrier.name, carrier);
  };

  const handleFocus = () => {
    const matches = searchCarriers(query, mode, 12);
    setResults(matches);
    if (matches.length > 0) setOpen(true);
  };

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted(h => Math.min(h + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    else if (e.key === "Enter" && highlighted >= 0) { e.preventDefault(); handleSelect(results[highlighted]); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  const handleBlur = () => {
    setTimeout(() => { if (!open) onChange(query); }, 200);
  };

  const ModeIcon = MODE_ICONS[mode] || Ship;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {label && <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 6 }}>{label}</label>}
      <div style={{ position: "relative" }}>
        <ModeIcon size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.text3 }} />
        <input
          type="text"
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Start typing carrier name..."
          style={{
            width: "100%", padding: "10px 12px 10px 34px", borderRadius: 8, fontSize: 14,
            border: `1px solid ${open ? T.accent : T.border1}`, background: T.bg3, color: T.text0,
            outline: "none", transition: "border-color 0.15s",
          }}
        />
      </div>

      {open && results.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4,
          background: T.bg3, border: `1px solid ${T.border2}`, borderRadius: 10,
          boxShadow: `0 12px 40px ${T.shadowHeavy}`, zIndex: 50, overflow: "hidden", maxHeight: 320, overflowY: "auto",
        }}>
          {results.map((carrier, i) => {
            const prevTier = i > 0 ? results[i - 1].tier : null;
            const showDivider = prevTier && prevTier !== carrier.tier;

            return (
              <div key={`${carrier.name}-${i}`}>
                {showDivider && (
                  <div style={{ padding: "6px 14px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: T.text3, background: T.bg4 }}>
                    {TIER_LABELS[carrier.tier] || carrier.tier} carriers
                  </div>
                )}
                {i === 0 && (
                  <div style={{ padding: "6px 14px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: T.text3, background: T.bg4 }}>
                    {TIER_LABELS[carrier.tier] || carrier.tier} carriers
                  </div>
                )}
                <button
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(carrier); }}
                  onMouseEnter={() => setHighlighted(i)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                    background: highlighted === i ? T.bg4 : "transparent",
                    border: "none", borderBottom: `1px solid ${T.border0}`,
                    cursor: "pointer", textAlign: "left", transition: "background 0.1s",
                  }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: T.bg4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: T.text2 }}>{carrier.country}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: T.text0 }}>{carrier.name}</div>
                    {carrier.alliance && carrier.alliance !== "None" && (
                      <div style={{ fontSize: 11, color: T.text3 }}>{carrier.alliance}</div>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
