// CustomerStatusReport.jsx — AI-generated customer status email
// Props: T, shipments, projects, rates, isDark, onClose, initialProjectId

import { useState, useCallback } from 'react';
import { X, Mail, Copy, Check, RefreshCw, ChevronDown, AlertTriangle, FileText } from 'lucide-react';
import { getAiWorkerUrl } from '../utils/assistantContext.js';
import { toEUR, formatEUR } from '../utils/currency.js';

const MODEL = 'claude-sonnet-4-20250514';

function fmtDate(d) {
  if (!d || d === '—') return '—';
  return new Date(d).toLocaleDateString('fi-FI', { day: 'numeric', month: 'long', year: 'numeric' });
}

function daysUntil(d) {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date()) / 86400000);
}

const TONES = [
  { id: 'professional', label: 'Professional' },
  { id: 'concise',      label: 'Concise' },
  { id: 'detailed',     label: 'Detailed' },
];

const LANGUAGES = [
  { id: 'english', label: 'English' },
  { id: 'finnish', label: 'Finnish' },
  { id: 'swedish', label: 'Swedish' },
];

export default function CustomerStatusReport({ T, shipments, projects, rates, isDark, onClose, initialProjectId }) {
  const [projectId,  setProjectId]  = useState(initialProjectId || (projects[0]?.id ?? ''));
  const [tone,       setTone]       = useState('professional');
  const [language,   setLanguage]   = useState('english');
  const [notes,      setNotes]      = useState('');
  const [generating, setGenerating] = useState(false);
  const [report,     setReport]     = useState('');
  const [error,      setError]      = useState(null);
  const [copied,     setCopied]     = useState(false);

  const workerUrl = getAiWorkerUrl();
  const project = projects.find(p => p.id === projectId);
  const projectShipments = shipments.filter(s => s.projectId === projectId);

  // Build a rich text summary of the project for Claude
  function buildProjectContext() {
    if (!project) return '';

    const lines = [];
    lines.push(`PROJECT: ${project.name}`);
    lines.push(`CUSTOMER: ${project.customer || 'N/A'}`);
    lines.push(`TOTAL SHIPMENTS: ${projectShipments.length}`);
    lines.push('');

    for (const s of projectShipments) {
      lines.push(`--- Shipment: ${s.ref || s.customerRef || s.id.slice(0, 8)} ---`);
      lines.push(`Customer ref: ${s.customerRef || '—'}`);
      lines.push(`Route: ${s.origin} → ${s.destination}`);
      lines.push(`Mode: ${s.mode} | Carrier: ${s.carrier || '—'}`);
      lines.push(`Status: ${s.status.replace('_', ' ')}`);
      if (s.vessel && s.vessel !== 'TBD') lines.push(`Vessel: ${s.vessel} ${s.voyage ? `(Voy. ${s.voyage})` : ''}`);
      if (s.etd) lines.push(`ETD: ${fmtDate(s.etd)}`);
      if (s.eta) {
        const d = daysUntil(s.eta);
        const etaNote = d !== null ? (d < 0 ? ` (${Math.abs(d)} days ago)` : d === 0 ? ' (TODAY)' : ` (in ${d} days)`) : '';
        lines.push(`ETA: ${fmtDate(s.eta)}${etaNote}`);
      }
      if (s.originalETA && s.originalETA !== s.eta) {
        const delay = Math.ceil((new Date(s.eta) - new Date(s.originalETA)) / 86400000);
        if (delay > 0) lines.push(`⚠ ETA delayed ${delay} days from original ${fmtDate(s.originalETA)}`);
      }
      if (s.blNumber) lines.push(`BL/SWB: ${s.blNumber}`);
      if (s.routing) lines.push(`Routing: ${s.routing}`);
      if (s.containerType) lines.push(`Container: ${s.containerType}`);

      // Milestones
      const milestones = s.milestones || [];
      const done    = milestones.filter(m => m.done);
      const pending = milestones.filter(m => !m.done);
      if (done.length)    lines.push(`Completed milestones: ${done.map(m => m.label).join(', ')}`);
      if (pending.length) {
        const next = pending[0];
        const nd = next.date ? daysUntil(next.date) : null;
        lines.push(`Next milestone: ${next.label}${next.date ? ` — ${fmtDate(next.date)}${nd !== null ? (nd < 0 ? ` (${Math.abs(nd)} days overdue!)` : nd === 0 ? ' (TODAY)' : ` (in ${nd} days)`) : ''}` : ''}`);
        const remaining = pending.slice(1, 4).map(m => m.label);
        if (remaining.length) lines.push(`Upcoming: ${remaining.join(' → ')}`);
      }

      // Costs summary
      const costs = s.costs?.items || [];
      const totalEUR = costs.reduce((sum, c) => sum + toEUR(c.amount, c.currency, rates), 0);
      const quoted = s.costs?.quoted || 0;
      if (quoted > 0) {
        const margin = quoted - totalEUR;
        lines.push(`Quoted: ${formatEUR(quoted)} | Actual: ${formatEUR(totalEUR)} | Margin: ${formatEUR(margin)}`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  const generate = useCallback(async () => {
    if (!workerUrl) { setError('AI worker URL not set. Go to Settings → AI Assistant.'); return; }
    if (!project) { setError('Select a project first.'); return; }

    setGenerating(true);
    setError(null);
    setReport('');

    const context = buildProjectContext();
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const prompt = `You are a logistics coordinator writing a customer status update email.

Today's date: ${today}

PROJECT DATA:
${context}

${notes ? `ADDITIONAL NOTES FROM COORDINATOR:\n${notes}\n` : ''}

Write a ${tone} status update email in ${language} for the customer "${project.customer || project.name}".

Requirements:
- Professional email format with subject line, greeting, body, and sign-off
- Summarize the current status of each shipment clearly
- Highlight any delays, upcoming ETAs, or milestones the customer should know about
- For in-transit shipments, mention vessel name and ETA
- For delivered shipments, confirm delivery and mention billing if pending
- Keep it customer-facing — do not mention internal cost/margin data
- Sign off as "Logistics Team" (no specific name)
- The subject line should reference the project name

Write only the email — no preamble, no explanation, just the email text.`;

    try {
      const res = await fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1500,
          stream: true,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Worker error ${res.status}: ${text.slice(0, 200)}`);
      }

      // Stream the response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop();
        for (const part of parts) {
          const dataLine = part.split('\n').find(l => l.startsWith('data: '));
          if (!dataLine) continue;
          const json = dataLine.slice(6).trim();
          if (json === '[DONE]') continue;
          try {
            const evt = JSON.parse(json);
            if (evt.type === 'content_block_delta' && evt.delta?.text) {
              accumulated += evt.delta.text;
              setReport(accumulated);
            }
          } catch {}
        }
      }

    } catch (err) {
      setError(`Generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  }, [project, projectId, tone, language, notes, workerUrl, shipments, rates]);

  function handleCopy() {
    if (!report) return;
    navigator.clipboard.writeText(report).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  const selectStyle = {
    padding: '8px 12px', borderRadius: 8, fontSize: 13,
    border: `1px solid ${T.border1}`, background: T.bg3,
    color: T.text0, outline: 'none', cursor: 'pointer',
  };

  const btnStyle = (active, col) => ({
    padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 500,
    cursor: 'pointer', border: `1px solid ${active ? col : T.border1}`,
    background: active ? `${col}18` : T.bg3,
    color: active ? col : T.text2, transition: 'all 0.15s',
  });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />

      <div style={{
        position: 'relative', width: 760, maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        background: T.bg2, borderRadius: 16,
        border: `1px solid ${T.border1}`,
        boxShadow: `0 24px 80px rgba(0,0,0,0.4)`,
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${T.border1}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: T.accentGlow, border: `1px solid rgba(59,130,246,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={16} color={T.accent} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text0 }}>Customer Status Report</div>
              <div style={{ fontSize: 11, color: T.text3 }}>AI-generated project status email</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.text3, cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Controls */}
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${T.border1}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>

            {/* Project select */}
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.text3, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Project</div>
              <select value={projectId} onChange={e => { setProjectId(e.target.value); setReport(''); setError(null); }} style={{ ...selectStyle, width: '100%' }}>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — {p.customer}</option>
                ))}
              </select>
            </div>

            {/* Tone */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.text3, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tone</div>
              <div style={{ display: 'flex', gap: 5 }}>
                {TONES.map(t => (
                  <button key={t.id} onClick={() => setTone(t.id)} style={btnStyle(tone === t.id, T.accent)}>{t.label}</button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.text3, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Language</div>
              <div style={{ display: 'flex', gap: 5 }}>
                {LANGUAGES.map(l => (
                  <button key={l.id} onClick={() => setLanguage(l.id)} style={btnStyle(language === l.id, T.accent)}>{l.label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Optional notes */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.text3, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Additional notes for Claude (optional)</div>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder='e.g. "Mention the port congestion delay at Rotterdam" or "Focus on the USGOLD 3 shipment"'
              style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* Shipment summary chips */}
          {projectShipments.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {projectShipments.map(s => {
                const statusColors = { planned: T.text3, booked: T.amber, in_transit: T.accent, arrived: T.purple, delivered: T.green, completed: T.text3 };
                const col = statusColors[s.status] || T.text3;
                return (
                  <span key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: T.bg3, border: `1px solid ${T.border1}`, color: col }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: col, display: 'inline-block' }} />
                    {s.customerRef || s.ref || 'Shipment'}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px' }}>

          {/* Generate button */}
          <div style={{ paddingTop: 16, marginBottom: report || error ? 16 : 0 }}>
            <button
              onClick={generate}
              disabled={generating || !workerUrl || !project}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 9, fontSize: 14, fontWeight: 600,
                color: 'white', border: 'none', cursor: generating || !workerUrl || !project ? 'not-allowed' : 'pointer',
                background: generating || !workerUrl || !project ? T.bg4 : T.accent,
                transition: 'all 0.15s',
              }}
            >
              {generating
                ? <><RefreshCw size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Generating…</>
                : <><Mail size={15} /> Generate Status Email</>
              }
            </button>
            {!workerUrl && (
              <div style={{ marginTop: 8, fontSize: 12, color: T.amber }}>
                AI worker URL not set — go to Settings → AI Assistant.
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', borderRadius: 8, background: T.redBg, border: `1px solid ${T.redBorder}`, color: T.red, fontSize: 13, marginBottom: 16 }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </div>
          )}

          {/* Report output */}
          {report && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.text2, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={13} color={T.green} />
                  Ready to send — review and copy
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={generate} disabled={generating}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500, color: T.text2, background: T.bg3, border: `1px solid ${T.border1}`, cursor: 'pointer' }}>
                    <RefreshCw size={12} /> Regenerate
                  </button>
                  <button onClick={handleCopy}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, color: copied ? T.green : 'white', background: copied ? T.greenBg : T.accent, border: `1px solid ${copied ? T.greenBorder : T.accent}`, cursor: 'pointer', transition: 'all 0.2s' }}>
                    {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                  </button>
                </div>
              </div>
              <textarea
                value={report}
                onChange={e => setReport(e.target.value)}
                style={{
                  width: '100%', minHeight: 340, padding: '14px 16px',
                  borderRadius: 10, fontSize: 13, lineHeight: 1.7,
                  border: `1px solid ${T.border1}`, background: T.bg3,
                  color: T.text0, outline: 'none', resize: 'vertical',
                  fontFamily: "'Inter', -apple-system, sans-serif",
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ fontSize: 11, color: T.text3, marginTop: 6 }}>
                You can edit the text above before copying. Changes are not saved.
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
