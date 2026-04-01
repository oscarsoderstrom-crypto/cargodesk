import { useState, useEffect } from "react";
import { Plus, X, Play, Pause, Square, Trash2, Edit3, Check } from "lucide-react";
import { getShipment, updateShipment } from "../db/schema.js";
import { toEUR, formatEUR, formatCurrency, SUPPORTED_CURRENCIES } from "../utils/currency.js";

export default function CostsTab({ T, shipment, rates, onUpdate }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showRunningForm, setShowRunningForm] = useState(false);
  const [editingQuoted, setEditingQuoted] = useState(false);
  const [quotedInput, setQuotedInput] = useState(shipment.costs?.quoted || 0);
  const [newCost, setNewCost] = useState({ category: "transport", desc: "", amount: "", currency: "EUR" });
  const [newRunning, setNewRunning] = useState({ desc: "", dailyRate: "", currency: "EUR" });
  const mono = "'JetBrains Mono',monospace";

  // Recalculate running costs based on current date
  const calcRunningDays = (r) => {
    if (!r.startDate) return 0;
    const start = new Date(r.startDate);
    const end = r.status === "running" ? new Date() : (r.endDate ? new Date(r.endDate) : new Date());
    return Math.max(1, Math.ceil((end - start) / 86400000));
  };

  const items = shipment.costs?.items || [];
  const running = (shipment.costs?.running || []).map(r => ({
    ...r,
    totalDays: calcRunningDays(r),
  }));

  const totalFixedEUR = items.reduce((s, c) => s + toEUR(c.amount, c.currency, rates), 0);
  const totalRunningEUR = running.reduce((s, r) => s + toEUR(r.dailyRate * r.totalDays, r.currency, rates), 0);
  const totalCostEUR = totalFixedEUR + totalRunningEUR;
  const quoted = shipment.costs?.quoted || 0;
  const margin = quoted - totalCostEUR;
  const marginPct = quoted > 0 ? (margin / quoted * 100) : 0;

  const inputStyle = {
    padding: "8px 10px", borderRadius: 6, fontSize: 13,
    border: `1px solid ${T.border1}`, background: T.bg3, color: T.text0, outline: "none",
  };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: T.text3, marginBottom: 4, display: "block" };

  // ---- HANDLERS ----

  const saveQuoted = async () => {
    const val = parseFloat(quotedInput) || 0;
    const updated = { ...shipment.costs, quoted: val };
    await updateShipment(shipment.id, { costs: updated });
    setEditingQuoted(false);
    if (onUpdate) onUpdate();
  };

  const addCostItem = async () => {
    if (!newCost.desc || !newCost.amount) return;
    const item = {
      id: crypto.randomUUID(),
      category: newCost.category,
      desc: newCost.desc,
      amount: parseFloat(newCost.amount),
      currency: newCost.currency,
    };
    const updatedItems = [...items, item];
    await updateShipment(shipment.id, { costs: { ...shipment.costs, items: updatedItems } });
    setNewCost({ category: "transport", desc: "", amount: "", currency: "EUR" });
    setShowAddForm(false);
    if (onUpdate) onUpdate();
  };

  const deleteCostItem = async (itemId) => {
    const updatedItems = items.filter(c => c.id !== itemId);
    await updateShipment(shipment.id, { costs: { ...shipment.costs, items: updatedItems } });
    if (onUpdate) onUpdate();
  };

  const addRunningCost = async () => {
    if (!newRunning.desc || !newRunning.dailyRate) return;
    const rc = {
      id: crypto.randomUUID(),
      desc: newRunning.desc,
      dailyRate: parseFloat(newRunning.dailyRate),
      currency: newRunning.currency,
      startDate: new Date().toISOString().split('T')[0],
      status: "running",
      endDate: null,
    };
    const updatedRunning = [...(shipment.costs?.running || []), rc];
    await updateShipment(shipment.id, { costs: { ...shipment.costs, running: updatedRunning } });
    setNewRunning({ desc: "", dailyRate: "", currency: "EUR" });
    setShowRunningForm(false);
    if (onUpdate) onUpdate();
  };

  const toggleRunningCost = async (rcId) => {
    const updatedRunning = (shipment.costs?.running || []).map(r => {
      if (r.id !== rcId) return r;
      if (r.status === "running") {
        return { ...r, status: "paused", endDate: new Date().toISOString().split('T')[0] };
      } else {
        return { ...r, status: "running", endDate: null };
      }
    });
    await updateShipment(shipment.id, { costs: { ...shipment.costs, running: updatedRunning } });
    if (onUpdate) onUpdate();
  };

  const stopRunningCost = async (rcId) => {
    const updatedRunning = (shipment.costs?.running || []).map(r => {
      if (r.id !== rcId) return r;
      return { ...r, status: "stopped", endDate: new Date().toISOString().split('T')[0] };
    });
    await updateShipment(shipment.id, { costs: { ...shipment.costs, running: updatedRunning } });
    if (onUpdate) onUpdate();
  };

  const deleteRunningCost = async (rcId) => {
    const updatedRunning = (shipment.costs?.running || []).filter(r => r.id !== rcId);
    await updateShipment(shipment.id, { costs: { ...shipment.costs, running: updatedRunning } });
    if (onUpdate) onUpdate();
  };

  const fmtDate = d => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("fi-FI", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Quoted - editable */}
        <div style={{ padding: 16, borderRadius: 12, background: T.bg2, border: `1px solid ${T.border1}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: T.text2 }}>Quoted to Customer</span>
            {!editingQuoted && (
              <button onClick={() => { setQuotedInput(quoted); setEditingQuoted(true); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: T.text3, padding: 2 }}>
                <Edit3 size={12} />
              </button>
            )}
          </div>
          {editingQuoted ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <input type="number" value={quotedInput} onChange={e => setQuotedInput(e.target.value)}
                style={{ ...inputStyle, flex: 1, fontSize: 18, fontWeight: 700, fontFamily: mono }} autoFocus />
              <button onClick={saveQuoted} style={{ background: T.green, border: "none", borderRadius: 4, padding: 6, cursor: "pointer" }}>
                <Check size={14} color="white" />
              </button>
              <button onClick={() => setEditingQuoted(false)} style={{ background: T.bg4, border: "none", borderRadius: 4, padding: 6, cursor: "pointer" }}>
                <X size={14} color={T.text2} />
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 20, fontWeight: 700, color: T.accent, fontFamily: mono, marginTop: 4 }}>{formatEUR(quoted)}</div>
          )}
        </div>
        <div style={{ padding: 16, borderRadius: 12, background: T.bg2, border: `1px solid ${T.border1}` }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, color: T.text2 }}>Total Costs</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text1, fontFamily: mono }}>{formatEUR(totalCostEUR)}</div>
          {totalRunningEUR > 0 && <div style={{ fontSize: 11, color: T.red, marginTop: 2 }}>incl. {formatEUR(totalRunningEUR)} running</div>}
        </div>
        <div style={{ padding: 16, borderRadius: 12, background: T.bg2, border: `1px solid ${margin >= 0 ? T.border1 : T.redBorder}` }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, color: T.text2 }}>Margin</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: margin >= 0 ? T.green : T.red, fontFamily: mono }}>{formatEUR(margin)}</div>
          <div style={{ fontSize: 11, color: margin >= 0 ? T.green : T.red }}>{marginPct.toFixed(1)}%</div>
          {margin < 0 && <div style={{ fontSize: 11, fontWeight: 600, color: T.red, marginTop: 4 }}>⚠ Costs exceed quoted amount</div>}
        </div>
      </div>

      {/* Fixed cost items by category */}
      {["origin", "transport", "transhipment", "destination"].map(cat => {
        const catItems = items.filter(c => c.category === cat);
        if (!catItems.length) return null;
        return (
          <div key={cat} style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, paddingLeft: 4, color: T.text3 }}>{cat}</h4>
            <div style={{ borderRadius: 10, border: `1px solid ${T.border1}`, overflow: "hidden" }}>
              {catItems.map((c, i) => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: i < catItems.length - 1 ? `1px solid ${T.border0}` : "none", background: T.bg2 }}>
                  <span style={{ fontSize: 14, color: T.text1 }}>{c.desc}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: T.text0, fontFamily: mono }}>{c.currency} {c.amount.toLocaleString("fi-FI")}</span>
                      {c.currency !== "EUR" && <div style={{ fontSize: 12, color: T.text3 }}>≈ {formatEUR(toEUR(c.amount, c.currency, rates))}</div>}
                    </div>
                    <button onClick={() => deleteCostItem(c.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: T.text3, padding: 4 }}
                      onMouseEnter={e => e.currentTarget.style.color = T.red} onMouseLeave={e => e.currentTarget.style.color = T.text3}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Running costs */}
      {running.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, paddingLeft: 4, color: T.red }}>
            Running Costs
          </h4>
          <div style={{ borderRadius: 10, border: `1px solid ${T.redBorder}`, overflow: "hidden" }}>
            {running.map(r => (
              <div key={r.id} style={{ padding: "12px 16px", background: T.redBg, borderBottom: `1px solid ${T.redBorder}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: T.text1 }}>{r.desc}</span>
                    <div style={{ fontSize: 12, marginTop: 2, color: T.text2 }}>
                      {fmtDate(r.startDate)} → {r.status === "running" ? "ongoing" : fmtDate(r.endDate)} • {r.totalDays} days × {r.currency} {r.dailyRate}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: T.red, fontFamily: mono }}>
                      {r.currency} {(r.totalDays * r.dailyRate).toLocaleString("fi-FI")}
                    </span>
                    <span style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 10, fontWeight: 600,
                      background: r.status === "running" ? T.redBg : r.status === "paused" ? T.amberBg : T.greenBg,
                      color: r.status === "running" ? T.red : r.status === "paused" ? T.amber : T.green,
                      border: `1px solid ${r.status === "running" ? T.redBorder : r.status === "paused" ? T.amberBorder : T.greenBorder}`
                    }}>
                      {r.status === "running" ? "RUNNING" : r.status === "paused" ? "PAUSED" : "STOPPED"}
                    </span>
                  </div>
                </div>
                {/* Controls */}
                {r.status !== "stopped" && (
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <button onClick={() => toggleRunningCost(r.id)}
                      style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", background: T.bg3, border: `1px solid ${T.border1}`, color: T.text1 }}>
                      {r.status === "running" ? <><Pause size={12} /> Pause</> : <><Play size={12} /> Resume</>}
                    </button>
                    <button onClick={() => stopRunningCost(r.id)}
                      style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", background: T.bg3, border: `1px solid ${T.border1}`, color: T.text1 }}>
                      <Square size={12} /> Stop
                    </button>
                    <button onClick={() => deleteRunningCost(r.id)}
                      style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", background: "none", border: `1px solid ${T.redBorder}`, color: T.red }}>
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add cost item form */}
      {showAddForm && (
        <div style={{ padding: 16, borderRadius: 10, background: T.bg3, border: `1px solid ${T.border1}`, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text0, marginBottom: 12 }}>Add Cost Item</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Category</label>
              <select value={newCost.category} onChange={e => setNewCost({ ...newCost, category: e.target.value })}
                style={{ ...inputStyle, width: "100%", cursor: "pointer" }}>
                <option value="origin">Origin</option>
                <option value="transport">Transport</option>
                <option value="transhipment">Transhipment</option>
                <option value="destination">Destination</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <input value={newCost.desc} onChange={e => setNewCost({ ...newCost, desc: e.target.value })}
                placeholder="e.g. THC Helsinki" style={{ ...inputStyle, width: "100%" }} />
            </div>
            <div>
              <label style={labelStyle}>Amount</label>
              <input type="number" value={newCost.amount} onChange={e => setNewCost({ ...newCost, amount: e.target.value })}
                placeholder="0" style={{ ...inputStyle, width: "100%" }} />
            </div>
            <div>
              <label style={labelStyle}>Currency</label>
              <select value={newCost.currency} onChange={e => setNewCost({ ...newCost, currency: e.target.value })}
                style={{ ...inputStyle, width: "100%", cursor: "pointer" }}>
                {SUPPORTED_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setShowAddForm(false)}
              style={{ padding: "6px 14px", borderRadius: 6, fontSize: 13, color: T.text2, background: T.bg4, border: "none", cursor: "pointer" }}>Cancel</button>
            <button onClick={addCostItem} disabled={!newCost.desc || !newCost.amount}
              style={{ padding: "6px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600, color: "white", background: (!newCost.desc || !newCost.amount) ? T.bg4 : T.accent, border: "none", cursor: (!newCost.desc || !newCost.amount) ? "not-allowed" : "pointer" }}>
              Add
            </button>
          </div>
        </div>
      )}

      {/* Add running cost form */}
      {showRunningForm && (
        <div style={{ padding: 16, borderRadius: 10, background: T.bg3, border: `1px solid ${T.amberBorder}`, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text0, marginBottom: 12 }}>Add Running Cost</div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Description</label>
              <input value={newRunning.desc} onChange={e => setNewRunning({ ...newRunning, desc: e.target.value })}
                placeholder="e.g. Demurrage, Detention, Storage" style={{ ...inputStyle, width: "100%" }} />
            </div>
            <div>
              <label style={labelStyle}>Daily Rate</label>
              <input type="number" value={newRunning.dailyRate} onChange={e => setNewRunning({ ...newRunning, dailyRate: e.target.value })}
                placeholder="0" style={{ ...inputStyle, width: "100%" }} />
            </div>
            <div>
              <label style={labelStyle}>Currency</label>
              <select value={newRunning.currency} onChange={e => setNewRunning({ ...newRunning, currency: e.target.value })}
                style={{ ...inputStyle, width: "100%", cursor: "pointer" }}>
                {SUPPORTED_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ fontSize: 12, color: T.text2, marginBottom: 12 }}>Timer starts immediately from today. You can pause/resume/stop it anytime.</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setShowRunningForm(false)}
              style={{ padding: "6px 14px", borderRadius: 6, fontSize: 13, color: T.text2, background: T.bg4, border: "none", cursor: "pointer" }}>Cancel</button>
            <button onClick={addRunningCost} disabled={!newRunning.desc || !newRunning.dailyRate}
              style={{ padding: "6px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600, color: "white", background: (!newRunning.desc || !newRunning.dailyRate) ? T.bg4 : T.amber, border: "none", cursor: (!newRunning.desc || !newRunning.dailyRate) ? "not-allowed" : "pointer" }}>
              Start Running
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!showAddForm && !showRunningForm && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={() => setShowAddForm(true)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 8, fontSize: 14, fontWeight: 500, color: T.accent, border: `1px dashed ${T.border2}`, background: "none", cursor: "pointer" }}>
            <Plus size={16} /> Add Cost Item
          </button>
          <button onClick={() => setShowRunningForm(true)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 8, fontSize: 14, fontWeight: 500, color: T.amber, border: `1px dashed ${T.amberBorder}`, background: "none", cursor: "pointer" }}>
            <Play size={16} /> Add Running Cost
          </button>
        </div>
      )}
    </div>
  );
}
