import { useState } from "react";
import { Plus, X, Play, Pause, Square, Trash2, Edit3, Check, TrendingUp, TrendingDown } from "lucide-react";
import { updateShipment } from "../db/schema.js";
import { toEUR, formatEUR, formatCurrency, SUPPORTED_CURRENCIES } from "../utils/currency.js";

export default function CostsTab({ T, shipment, rates, onUpdate }) {
  const [showAddRevenue, setShowAddRevenue] = useState(false);
  const [showAddCost, setShowAddCost] = useState(false);
  const [showRunningForm, setShowRunningForm] = useState(false);
  const [newRevenue, setNewRevenue] = useState({ desc: "", amount: "", currency: "EUR" });
  const [newCost, setNewCost] = useState({ category: "transport", desc: "", amount: "", currency: "EUR" });
  const [newRunning, setNewRunning] = useState({ desc: "", dailyRate: "", currency: "EUR" });
  const mono = "'JetBrains Mono',monospace";

  // Split items by side — backward compat: items without 'side' default to 'cost'
  const allItems = shipment.costs?.items || [];
  const revenueItems = allItems.filter(c => c.side === 'revenue');
  const costItems = allItems.filter(c => c.side !== 'revenue');

  // Running costs
  const calcRunningDays = (r) => {
    if (!r.startDate) return 0;
    const start = new Date(r.startDate);
    const end = r.status === "running" ? new Date() : (r.endDate ? new Date(r.endDate) : new Date());
    return Math.max(1, Math.ceil((end - start) / 86400000));
  };
  const running = (shipment.costs?.running || []).map(r => ({ ...r, totalDays: calcRunningDays(r) }));

  // Totals
  const totalRevenueEUR = revenueItems.reduce((s, c) => s + toEUR(c.amount, c.currency, rates), 0);
  const totalCostsEUR = costItems.reduce((s, c) => s + toEUR(c.amount, c.currency, rates), 0);
  const totalRunningEUR = running.reduce((s, r) => s + toEUR(r.dailyRate * r.totalDays, r.currency, rates), 0);
  const totalBuyingEUR = totalCostsEUR + totalRunningEUR;

  // Use costs.quoted as revenue if no revenue items exist yet (backward compat)
  const displayRevenue = totalRevenueEUR > 0 ? totalRevenueEUR : (shipment.costs?.quoted || 0);
  const margin = displayRevenue - totalBuyingEUR;
  const marginPct = displayRevenue > 0 ? (margin / displayRevenue * 100) : 0;

  const inputStyle = { padding: "8px 10px", borderRadius: 6, fontSize: 13, border: `1px solid ${T.border1}`, background: T.bg3, color: T.text0, outline: "none" };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: T.text3, marginBottom: 4, display: "block" };

  // ── Save helper ──
  const saveCosts = async (updatedItems, extra = {}) => {
    const rev = updatedItems.filter(c => c.side === 'revenue');
    const quoted = rev.reduce((s, c) => s + toEUR(c.amount, c.currency, rates), 0);
    await updateShipment(shipment.id, { costs: { ...shipment.costs, items: updatedItems, quoted, ...extra } });
    if (onUpdate) onUpdate();
  };

  // ── Revenue handlers ──
  const addRevenueItem = async () => {
    if (!newRevenue.desc || !newRevenue.amount) return;
    const item = { id: crypto.randomUUID(), side: 'revenue', category: 'revenue', desc: newRevenue.desc, amount: parseFloat(newRevenue.amount), currency: newRevenue.currency };
    await saveCosts([...allItems, item]);
    setNewRevenue({ desc: "", amount: "", currency: "EUR" });
    setShowAddRevenue(false);
  };

  // ── Cost handlers ──
  const addCostItem = async () => {
    if (!newCost.desc || !newCost.amount) return;
    const item = { id: crypto.randomUUID(), side: 'cost', category: newCost.category, desc: newCost.desc, amount: parseFloat(newCost.amount), currency: newCost.currency };
    await saveCosts([...allItems, item]);
    setNewCost({ category: "transport", desc: "", amount: "", currency: "EUR" });
    setShowAddCost(false);
  };

  const deleteItem = async (itemId) => {
    await saveCosts(allItems.filter(c => c.id !== itemId));
  };

  // ── Running cost handlers ──
  const addRunningCost = async () => {
    if (!newRunning.desc || !newRunning.dailyRate) return;
    const rc = { id: crypto.randomUUID(), desc: newRunning.desc, dailyRate: parseFloat(newRunning.dailyRate), currency: newRunning.currency, startDate: new Date().toISOString().split('T')[0], status: "running", endDate: null };
    const updatedRunning = [...(shipment.costs?.running || []), rc];
    await updateShipment(shipment.id, { costs: { ...shipment.costs, running: updatedRunning } });
    setNewRunning({ desc: "", dailyRate: "", currency: "EUR" });
    setShowRunningForm(false);
    if (onUpdate) onUpdate();
  };

  const toggleRunningCost = async (rcId) => {
    const updatedRunning = (shipment.costs?.running || []).map(r => {
      if (r.id !== rcId) return r;
      return r.status === "running" ? { ...r, status: "paused", endDate: new Date().toISOString().split('T')[0] } : { ...r, status: "running", endDate: null };
    });
    await updateShipment(shipment.id, { costs: { ...shipment.costs, running: updatedRunning } });
    if (onUpdate) onUpdate();
  };

  const stopRunningCost = async (rcId) => {
    const updatedRunning = (shipment.costs?.running || []).map(r => r.id !== rcId ? r : { ...r, status: "stopped", endDate: new Date().toISOString().split('T')[0] });
    await updateShipment(shipment.id, { costs: { ...shipment.costs, running: updatedRunning } });
    if (onUpdate) onUpdate();
  };

  const deleteRunningCost = async (rcId) => {
    const updatedRunning = (shipment.costs?.running || []).filter(r => r.id !== rcId);
    await updateShipment(shipment.id, { costs: { ...shipment.costs, running: updatedRunning } });
    if (onUpdate) onUpdate();
  };

  const fmtDate = d => d ? new Date(d).toLocaleDateString("fi-FI", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <div>
      {/* ═══════ SUMMARY CARDS ═══════ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 16, borderRadius: 12, background: T.bg2, border: `1px solid ${T.greenBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <TrendingUp size={14} color={T.green} />
            <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: T.green }}>Revenue (Selling)</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.green, fontFamily: mono, marginTop: 4 }}>{formatEUR(displayRevenue)}</div>
          {revenueItems.length > 0 && <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>{revenueItems.length} line item{revenueItems.length !== 1 ? 's' : ''}</div>}
          {revenueItems.length === 0 && shipment.costs?.quoted > 0 && <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>from quoted total</div>}
        </div>
        <div style={{ padding: 16, borderRadius: 12, background: T.bg2, border: `1px solid ${T.redBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <TrendingDown size={14} color={T.red} />
            <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: T.red }}>Costs (Buying)</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text1, fontFamily: mono, marginTop: 4 }}>{formatEUR(totalBuyingEUR)}</div>
          {totalRunningEUR > 0 && <div style={{ fontSize: 11, color: T.red, marginTop: 2 }}>incl. {formatEUR(totalRunningEUR)} running</div>}
        </div>
        <div style={{ padding: 16, borderRadius: 12, background: T.bg2, border: `1px solid ${margin >= 0 ? T.greenBorder : T.redBorder}` }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: T.text2 }}>Profit / Margin</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: margin >= 0 ? T.green : T.red, fontFamily: mono, marginTop: 4 }}>{formatEUR(margin)}</div>
          <div style={{ fontSize: 11, color: margin >= 0 ? T.green : T.red }}>{marginPct.toFixed(1)}%</div>
          {margin < 0 && <div style={{ fontSize: 11, fontWeight: 600, color: T.red, marginTop: 4 }}>⚠ Costs exceed revenue</div>}
        </div>
      </div>

      {/* ═══════ REVENUE SECTION ═══════ */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, paddingLeft: 4 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: T.green, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <TrendingUp size={14} /> Revenue — Quoted to Customer
          </h4>
          {!showAddRevenue && (
            <button onClick={() => setShowAddRevenue(true)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, color: T.green, border: `1px dashed ${T.greenBorder}`, background: "none", cursor: "pointer" }}>
              <Plus size={12} /> Add
            </button>
          )}
        </div>

        {revenueItems.length > 0 && (
          <div style={{ borderRadius: 10, border: `1px solid ${T.greenBorder}`, overflow: "hidden", marginBottom: 8 }}>
            {revenueItems.map((c, i) => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: i < revenueItems.length - 1 ? `1px solid ${T.border0}` : "none", background: T.bg2 }}>
                <span style={{ fontSize: 14, color: T.text1 }}>{c.desc}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: T.green, fontFamily: mono }}>{c.currency} {c.amount.toLocaleString("fi-FI")}</span>
                    {c.currency !== "EUR" && <div style={{ fontSize: 12, color: T.text3 }}>≈ {formatEUR(toEUR(c.amount, c.currency, rates))}</div>}
                  </div>
                  <button onClick={() => deleteItem(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: T.text3, padding: 4 }} onMouseEnter={e => e.currentTarget.style.color = T.red} onMouseLeave={e => e.currentTarget.style.color = T.text3}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
            {/* Revenue total */}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", background: T.greenBg, borderTop: `1px solid ${T.greenBorder}` }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.green }}>Total Revenue</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: T.green, fontFamily: mono }}>{formatEUR(totalRevenueEUR)}</span>
            </div>
          </div>
        )}

        {revenueItems.length === 0 && !showAddRevenue && (
          <div style={{ padding: 20, borderRadius: 10, border: `1px dashed ${T.greenBorder}`, textAlign: "center", color: T.text3, fontSize: 13, background: T.bg2 }}>
            No selling items yet — add what you're quoting to the customer
          </div>
        )}

        {/* Add revenue form */}
        {showAddRevenue && (
          <div style={{ padding: 16, borderRadius: 10, background: T.bg3, border: `1px solid ${T.greenBorder}`, marginBottom: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              <div><label style={labelStyle}>Description</label><input value={newRevenue.desc} onChange={e => setNewRevenue({ ...newRevenue, desc: e.target.value })} placeholder="e.g. Ocean freight Helsinki-Houston" style={{ ...inputStyle, width: "100%" }} /></div>
              <div><label style={labelStyle}>Amount</label><input type="number" value={newRevenue.amount} onChange={e => setNewRevenue({ ...newRevenue, amount: e.target.value })} placeholder="0" style={{ ...inputStyle, width: "100%" }} /></div>
              <div><label style={labelStyle}>Currency</label><select value={newRevenue.currency} onChange={e => setNewRevenue({ ...newRevenue, currency: e.target.value })} style={{ ...inputStyle, width: "100%", cursor: "pointer" }}>{SUPPORTED_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowAddRevenue(false)} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 13, color: T.text2, background: T.bg4, border: "none", cursor: "pointer" }}>Cancel</button>
              <button onClick={addRevenueItem} disabled={!newRevenue.desc || !newRevenue.amount} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600, color: "white", background: (!newRevenue.desc || !newRevenue.amount) ? T.bg4 : T.green, border: "none", cursor: (!newRevenue.desc || !newRevenue.amount) ? "not-allowed" : "pointer" }}>Add Revenue</button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════ COSTS SECTION ═══════ */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, paddingLeft: 4 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: T.text2, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <TrendingDown size={14} /> Costs — Purchasing
          </h4>
          <div style={{ display: "flex", gap: 6 }}>
            {!showAddCost && !showRunningForm && (
              <>
                <button onClick={() => setShowAddCost(true)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, color: T.accent, border: `1px dashed ${T.border2}`, background: "none", cursor: "pointer" }}><Plus size={12} /> Add Cost</button>
                <button onClick={() => setShowRunningForm(true)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, color: T.amber, border: `1px dashed ${T.amberBorder}`, background: "none", cursor: "pointer" }}><Play size={12} /> Running Cost</button>
              </>
            )}
          </div>
        </div>

        {/* Cost items by category */}
        {["origin", "transport", "transhipment", "destination", "other"].map(cat => {
          const catItems = costItems.filter(c => (c.category || 'other') === cat);
          if (!catItems.length) return null;
          return (
            <div key={cat} style={{ marginBottom: 12 }}>
              <h5 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, paddingLeft: 4, color: T.text3 }}>{cat}</h5>
              <div style={{ borderRadius: 10, border: `1px solid ${T.border1}`, overflow: "hidden" }}>
                {catItems.map((c, i) => (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: i < catItems.length - 1 ? `1px solid ${T.border0}` : "none", background: T.bg2 }}>
                    <div>
                      <span style={{ fontSize: 14, color: T.text1 }}>{c.desc}</span>
                      {c.source === 'quote' && <span style={{ fontSize: 10, marginLeft: 8, padding: "1px 6px", borderRadius: 4, background: T.amberBg, color: T.amber }}>from quote</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: T.text0, fontFamily: mono }}>{c.currency} {c.amount.toLocaleString("fi-FI")}</span>
                        {c.currency !== "EUR" && <div style={{ fontSize: 12, color: T.text3 }}>≈ {formatEUR(toEUR(c.amount, c.currency, rates))}</div>}
                      </div>
                      <button onClick={() => deleteItem(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: T.text3, padding: 4 }} onMouseEnter={e => e.currentTarget.style.color = T.red} onMouseLeave={e => e.currentTarget.style.color = T.text3}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Costs total */}
        {costItems.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", background: T.redBg, borderRadius: 8, border: `1px solid ${T.redBorder}`, marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.red }}>Total Fixed Costs</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.red, fontFamily: mono }}>{formatEUR(totalCostsEUR)}</span>
          </div>
        )}

        {costItems.length === 0 && !showAddCost && (
          <div style={{ padding: 20, borderRadius: 10, border: `1px dashed ${T.border2}`, textAlign: "center", color: T.text3, fontSize: 13, background: T.bg2, marginBottom: 12 }}>
            No purchasing costs yet — drop carrier booking PDFs or add manually
          </div>
        )}

        {/* Running costs */}
        {running.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <h5 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, paddingLeft: 4, color: T.red }}>Running Costs</h5>
            <div style={{ borderRadius: 10, border: `1px solid ${T.redBorder}`, overflow: "hidden" }}>
              {running.map(r => (
                <div key={r.id} style={{ padding: "12px 16px", background: T.redBg, borderBottom: `1px solid ${T.redBorder}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 500, color: T.text1 }}>{r.desc}</span>
                      <div style={{ fontSize: 12, marginTop: 2, color: T.text2 }}>{fmtDate(r.startDate)} → {r.status === "running" ? "ongoing" : fmtDate(r.endDate)} • {r.totalDays}d × {r.currency} {r.dailyRate}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: T.red, fontFamily: mono }}>{r.currency} {(r.totalDays * r.dailyRate).toLocaleString("fi-FI")}</span>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, fontWeight: 600, background: r.status === "running" ? T.redBg : r.status === "paused" ? T.amberBg : T.greenBg, color: r.status === "running" ? T.red : r.status === "paused" ? T.amber : T.green, border: `1px solid ${r.status === "running" ? T.redBorder : r.status === "paused" ? T.amberBorder : T.greenBorder}` }}>
                        {r.status === "running" ? "RUNNING" : r.status === "paused" ? "PAUSED" : "STOPPED"}
                      </span>
                    </div>
                  </div>
                  {r.status !== "stopped" && (
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <button onClick={() => toggleRunningCost(r.id)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", background: T.bg3, border: `1px solid ${T.border1}`, color: T.text1 }}>{r.status === "running" ? <><Pause size={12} /> Pause</> : <><Play size={12} /> Resume</>}</button>
                      <button onClick={() => stopRunningCost(r.id)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", background: T.bg3, border: `1px solid ${T.border1}`, color: T.text1 }}><Square size={12} /> Stop</button>
                      <button onClick={() => deleteRunningCost(r.id)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", background: "none", border: `1px solid ${T.redBorder}`, color: T.red }}><Trash2 size={12} /> Delete</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add cost form */}
        {showAddCost && (
          <div style={{ padding: 16, borderRadius: 10, background: T.bg3, border: `1px solid ${T.border1}`, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text0, marginBottom: 12 }}>Add Purchasing Cost</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              <div><label style={labelStyle}>Category</label><select value={newCost.category} onChange={e => setNewCost({ ...newCost, category: e.target.value })} style={{ ...inputStyle, width: "100%", cursor: "pointer" }}><option value="origin">Origin</option><option value="transport">Transport</option><option value="transhipment">Transhipment</option><option value="destination">Destination</option><option value="other">Other</option></select></div>
              <div><label style={labelStyle}>Description</label><input value={newCost.desc} onChange={e => setNewCost({ ...newCost, desc: e.target.value })} placeholder="e.g. THC Helsinki" style={{ ...inputStyle, width: "100%" }} /></div>
              <div><label style={labelStyle}>Amount</label><input type="number" value={newCost.amount} onChange={e => setNewCost({ ...newCost, amount: e.target.value })} placeholder="0" style={{ ...inputStyle, width: "100%" }} /></div>
              <div><label style={labelStyle}>Currency</label><select value={newCost.currency} onChange={e => setNewCost({ ...newCost, currency: e.target.value })} style={{ ...inputStyle, width: "100%", cursor: "pointer" }}>{SUPPORTED_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowAddCost(false)} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 13, color: T.text2, background: T.bg4, border: "none", cursor: "pointer" }}>Cancel</button>
              <button onClick={addCostItem} disabled={!newCost.desc || !newCost.amount} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600, color: "white", background: (!newCost.desc || !newCost.amount) ? T.bg4 : T.accent, border: "none", cursor: (!newCost.desc || !newCost.amount) ? "not-allowed" : "pointer" }}>Add Cost</button>
            </div>
          </div>
        )}

        {/* Add running cost form */}
        {showRunningForm && (
          <div style={{ padding: 16, borderRadius: 10, background: T.bg3, border: `1px solid ${T.amberBorder}`, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text0, marginBottom: 12 }}>Add Running Cost</div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              <div><label style={labelStyle}>Description</label><input value={newRunning.desc} onChange={e => setNewRunning({ ...newRunning, desc: e.target.value })} placeholder="e.g. Demurrage, Detention" style={{ ...inputStyle, width: "100%" }} /></div>
              <div><label style={labelStyle}>Daily Rate</label><input type="number" value={newRunning.dailyRate} onChange={e => setNewRunning({ ...newRunning, dailyRate: e.target.value })} placeholder="0" style={{ ...inputStyle, width: "100%" }} /></div>
              <div><label style={labelStyle}>Currency</label><select value={newRunning.currency} onChange={e => setNewRunning({ ...newRunning, currency: e.target.value })} style={{ ...inputStyle, width: "100%", cursor: "pointer" }}>{SUPPORTED_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            </div>
            <div style={{ fontSize: 12, color: T.text2, marginBottom: 12 }}>Timer starts immediately. Pause/resume/stop anytime.</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowRunningForm(false)} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 13, color: T.text2, background: T.bg4, border: "none", cursor: "pointer" }}>Cancel</button>
              <button onClick={addRunningCost} disabled={!newRunning.desc || !newRunning.dailyRate} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600, color: "white", background: (!newRunning.desc || !newRunning.dailyRate) ? T.bg4 : T.amber, border: "none", cursor: (!newRunning.desc || !newRunning.dailyRate) ? "not-allowed" : "pointer" }}>Start Running</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
