// QuotesTab.jsx — Sidebar tab showing all freight quotes
// Inline styles only (no Tailwind per project convention)

import React, { useState, useEffect, useMemo } from 'react';
import { FileText, ChevronDown, ChevronRight, Link2, Trash2, Plus, ArrowRight, Clock } from 'lucide-react';

const CATEGORY_COLORS = {
  origin: '#3b82f6',
  transport: '#8b5cf6',
  destination: '#f59e0b',
  other: '#6b7280',
};

const CATEGORY_LABELS = {
  origin: 'Origin',
  transport: 'Transport',
  destination: 'Destination',
  other: 'Other',
};

export default function QuotesTab({ db, shipments = [], onLinkQuote, onNavigateShipment, isDark }) {
  const [quotes, setQuotes] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Colors
  const bg = isDark ? '#1e1e2e' : '#ffffff';
  const bgCard = isDark ? '#2a2a3c' : '#f8f9fa';
  const bgCardHover = isDark ? '#32324a' : '#f0f1f3';
  const text = isDark ? '#e2e2e8' : '#1a1a2e';
  const textMuted = isDark ? '#8888a0' : '#6b7280';
  const border = isDark ? '#3a3a4c' : '#e5e7eb';
  const accent = '#3b82f6';

  useEffect(() => {
    if (!db) return;
    db.quotes.toArray().then(setQuotes).catch(() => setQuotes([]));
  }, [db]);

  const sortedQuotes = useMemo(() => {
    return [...quotes].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [quotes]);

  const linkedShipmentMap = useMemo(() => {
    const map = {};
    for (const s of shipments) map[s.id] = s;
    return map;
  }, [shipments]);

  async function deleteQuote(id) {
    if (!db) return;
    await db.quotes.delete(id);
    setQuotes(prev => prev.filter(q => q.id !== id));
  }

  function formatCurrency(amount, currency) {
    return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <div style={{ padding: '12px 0', color: text }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: textMuted }}>
          Quotes ({quotes.length})
        </span>
      </div>

      {sortedQuotes.length === 0 && (
        <div style={{ padding: '24px 16px', textAlign: 'center', color: textMuted, fontSize: 13 }}>
          <FileText size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
          <div>No quotes yet</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Drop email .msg files or carrier quote PDFs on the Documents tab</div>
        </div>
      )}

      {sortedQuotes.map(q => {
        const isExpanded = expandedId === q.id;
        const linked = q.shipmentId ? linkedShipmentMap[q.shipmentId] : null;

        // Group costs by category
        const costsByCategory = {};
        for (const c of (q.costs || [])) {
          const cat = c.category || 'other';
          if (!costsByCategory[cat]) costsByCategory[cat] = [];
          costsByCategory[cat].push(c);
        }

        return (
          <div
            key={q.id}
            style={{
              margin: '0 8px 6px',
              borderRadius: 8,
              border: `1px solid ${border}`,
              background: bgCard,
              overflow: 'hidden',
              transition: 'background 0.15s',
            }}
          >
            {/* Header row */}
            <div
              onClick={() => setExpandedId(isExpanded ? null : q.id)}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {isExpanded ? <ChevronDown size={14} color={textMuted} /> : <ChevronRight size={14} color={textMuted} />}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{q.origin || '?'}</span>
                  <ArrowRight size={12} color={textMuted} />
                  <span>{q.destination || '?'}</span>
                </div>
                <div style={{ fontSize: 11, color: textMuted, marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {q.carrier && <span>{q.carrier}</span>}
                  {q.containerCount && q.containerType && <span>{q.containerCount}x{q.containerType}</span>}
                  {q.quoteNumber && <span>#{q.quoteNumber}</span>}
                </div>
              </div>

              {/* Totals */}
              <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                {q.totalEUR > 0 && <div style={{ color: accent }}>{formatCurrency(q.totalEUR, 'EUR')}</div>}
                {q.totalUSD > 0 && <div style={{ color: '#10b981' }}>{formatCurrency(q.totalUSD, 'USD')}</div>}
              </div>
            </div>

            {/* Expanded detail */}
            {isExpanded && (
              <div style={{ padding: '0 12px 12px', borderTop: `1px solid ${border}` }}>
                {/* Cost breakdown by category */}
                {Object.entries(costsByCategory).map(([cat, costs]) => (
                  <div key={cat} style={{ marginTop: 10 }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                      color: CATEGORY_COLORS[cat] || textMuted, marginBottom: 4
                    }}>
                      {CATEGORY_LABELS[cat] || cat}
                    </div>
                    {costs.map(c => (
                      <div key={c.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '3px 0', fontSize: 12, color: text,
                      }}>
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.description}
                          {c.perUnit !== 'total' && (
                            <span style={{ color: textMuted, fontSize: 10, marginLeft: 4 }}>
                              ({c.perUnit.replace('per_', 'per ')})
                            </span>
                          )}
                        </span>
                        <span style={{ fontWeight: 600, marginLeft: 8, whiteSpace: 'nowrap' }}>
                          {formatCurrency(c.amount, c.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}

                {/* Metadata row */}
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11, color: textMuted }}>
                  <span><Clock size={10} style={{ verticalAlign: -1 }} /> {formatDate(q.createdAt)}</span>
                  {q.validUntil && <span>Valid until {formatDate(q.validUntil)}</span>}
                  {q.source && <span>via {q.source}</span>}
                </div>

                {/* Linked shipment */}
                {linked && (
                  <div
                    onClick={(e) => { e.stopPropagation(); onNavigateShipment?.(linked.id); }}
                    style={{
                      marginTop: 8, padding: '6px 8px', borderRadius: 6,
                      background: isDark ? '#1e1e2e' : '#eef2ff', cursor: 'pointer',
                      fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <Link2 size={12} color={accent} />
                    <span>Linked to <strong>{linked.ref || linked.id}</strong></span>
                  </div>
                )}

                {/* Actions */}
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  {!linked && onLinkQuote && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onLinkQuote(q); }}
                      style={{
                        padding: '4px 10px', fontSize: 11, borderRadius: 4, border: `1px solid ${accent}`,
                        background: 'transparent', color: accent, cursor: 'pointer',
                      }}
                    >
                      <Link2 size={10} style={{ verticalAlign: -1, marginRight: 4 }} />
                      Link to Shipment
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteQuote(q.id); }}
                    style={{
                      padding: '4px 10px', fontSize: 11, borderRadius: 4, border: `1px solid ${isDark ? '#555' : '#ccc'}`,
                      background: 'transparent', color: textMuted, cursor: 'pointer', marginLeft: 'auto',
                    }}
                  >
                    <Trash2 size={10} style={{ verticalAlign: -1, marginRight: 4 }} />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
