import { useState, useRef, useEffect } from "react";
import { MapPin } from "lucide-react";
import { searchPorts, formatPort } from "../utils/ports.js";

export default function PortSelect({ T, value, onChange, placeholder = "Start typing...", label }) {
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
    const matches = searchPorts(val);
    setResults(matches);
    setOpen(matches.length > 0);
    setHighlighted(-1);
    // If user clears, also clear value
    if (!val) onChange("");
  };

  const handleSelect = (port) => {
    const display = `${port.name}, ${port.country}`;
    setQuery(display);
    setOpen(false);
    onChange(display, port);
  };

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted(h => Math.min(h + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    else if (e.key === "Enter" && highlighted >= 0) { e.preventDefault(); handleSelect(results[highlighted]); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  const handleBlur = () => {
    // Allow the value to be whatever is typed (for custom locations not in the list)
    setTimeout(() => {
      if (!open) onChange(query);
    }, 200);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {label && <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 6 }}>{label}</label>}
      <div style={{ position: "relative" }}>
        <MapPin size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.text3 }} />
        <input
          type="text"
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => { if (query.length >= 2) { setResults(searchPorts(query)); setOpen(true); } }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
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
          boxShadow: `0 12px 40px ${T.shadowHeavy}`, zIndex: 50, overflow: "hidden", maxHeight: 260, overflowY: "auto",
        }}>
          {results.map((port, i) => (
            <button
              key={`${port.code}-${port.type}-${i}`}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(port); }}
              onMouseEnter={() => setHighlighted(i)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                background: highlighted === i ? T.bg4 : "transparent",
                border: "none", borderBottom: i < results.length - 1 ? `1px solid ${T.border0}` : "none",
                cursor: "pointer", textAlign: "left", transition: "background 0.1s",
              }}
            >
              <div style={{ width: 28, height: 28, borderRadius: 6, background: T.bg4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.text2 }}>{port.country}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: T.text0 }}>{port.name}</div>
                <div style={{ fontSize: 11, color: T.text3 }}>{port.code} • {port.type === "air" ? "Airport" : "Seaport"}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
