// AssistantPanel.jsx — Slide-in AI chat panel
// Props: shipments, projects, quotes, rates, isDark, onClose, onNavigate(id), onDataChange, selectedShipment

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Paperclip, Zap, Bot, User, CheckCircle2, XCircle, AlertTriangle, Loader, Settings } from 'lucide-react';
import { buildSystemPrompt, getAiWorkerUrl } from '../utils/assistantContext.js';
import { TOOLS, executeTool, describeToolCall } from '../utils/assistantTools.js';
import { extractTextFromPDF } from '../parsers/pdfParser.js';
import { processPdfText } from '../parsers/documentIntelligence.js';
import { processMsgFile } from '../parsers/msgParser.js';

const DARK  = {bg0:"#0A0E17",bg1:"#0F1421",bg2:"#161C2E",bg3:"#1C2438",bg4:"#232D45",border0:"#1A2236",border1:"#243049",border2:"#2E3D5C",text0:"#F1F5F9",text1:"#CBD5E1",text2:"#8494B0",text3:"#4F5E78",accent:"#3B82F6",accentGlow:"rgba(59,130,246,0.12)",green:"#10B981",greenBg:"rgba(16,185,129,0.12)",greenBorder:"rgba(16,185,129,0.25)",amber:"#F59E0B",amberBg:"rgba(245,158,11,0.12)",amberBorder:"rgba(245,158,11,0.25)",red:"#EF4444",redBg:"rgba(239,68,68,0.10)",redBorder:"rgba(239,68,68,0.25)",purple:"#A78BFA",purpleBg:"rgba(167,139,250,0.12)",purpleBorder:"rgba(167,139,250,0.25)",shadow:"rgba(0,0,0,0.3)",shadowHeavy:"rgba(0,0,0,0.5)"};
const LIGHT = {bg0:"#0B1120",bg1:"#F5F6F8",bg2:"#FFFFFF",bg3:"#F9FAFB",bg4:"#F3F4F6",border0:"#E5E7EB",border1:"#E5E7EB",border2:"#D1D5DB",text0:"#0F172A",text1:"#374151",text2:"#6B7280",text3:"#9CA3AF",accent:"#2563EB",accentGlow:"rgba(37,99,235,0.08)",green:"#059669",greenBg:"#D1FAE5",greenBorder:"#6EE7B7",amber:"#D97706",amberBg:"#FEF3C7",amberBorder:"#FDE68A",red:"#DC2626",redBg:"#FEE2E2",redBorder:"#FECACA",purple:"#7C3AED",purpleBg:"#EDE9FE",purpleBorder:"#C4B5FD",shadow:"rgba(0,0,0,0.06)",shadowHeavy:"rgba(0,0,0,0.15)"};
function getT(isDark) { return isDark ? DARK : LIGHT; }

const CONFIRM_KEY = 'cargodesk_ai_confirm_mode';
function getConfirmMode() { try { return localStorage.getItem(CONFIRM_KEY) === 'true'; } catch { return false; } }
function saveConfirmMode(v) { try { localStorage.setItem(CONFIRM_KEY, String(v)); } catch {} }

const MODEL = 'claude-sonnet-4-20250514';

// ─── SSE parser ───────────────────────────────────────────────────────────────

async function* parseSSE(reader) {
  const decoder = new TextDecoder();
  let buf = '';
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
      if (json === '[DONE]') return;
      try { yield JSON.parse(json); } catch {}
    }
  }
}

// ─── Stream one Anthropic request ─────────────────────────────────────────────

async function streamRequest(workerUrl, messages, systemPrompt, onText, onToolUse) {
  const response = await fetch(workerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Worker error ${response.status}: ${err}`);
  }

  const reader = response.body.getReader();
  const toolBlocks = {};
  let stopReason = null;
  let currentBlockType = null;
  let currentBlockIndex = null;

  for await (const event of parseSSE(reader)) {
    switch (event.type) {

      case 'content_block_start':
        currentBlockIndex = event.index;
        currentBlockType  = event.content_block?.type;
        if (currentBlockType === 'tool_use') {
          toolBlocks[event.index] = {
            id:    event.content_block.id,
            name:  event.content_block.name,
            input: '',
          };
        }
        break;

      case 'content_block_delta':
        if (event.delta?.type === 'text_delta') {
          onText(event.delta.text);
        } else if (event.delta?.type === 'input_json_delta' && toolBlocks[event.index]) {
          toolBlocks[event.index].input += event.delta.partial_json;
        }
        break;

      case 'message_delta':
        stopReason = event.delta?.stop_reason;
        break;
    }
  }

  // Parse tool inputs
  const tools = Object.values(toolBlocks).map(t => {
    let input = {};
    try { input = JSON.parse(t.input || '{}'); } catch {}
    return { id: t.id, name: t.name, input };
  });

  if (tools.length > 0) onToolUse(tools);

  return { stopReason, tools };
}

// ─── Action chip ──────────────────────────────────────────────────────────────

function ActionChip({ action, T }) {
  const color  = action.success ? T.green : T.red;
  const bg     = action.success ? T.greenBg : T.redBg;
  const border = action.success ? T.greenBorder : T.redBorder;
  const Icon   = action.success ? CheckCircle2 : XCircle;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '7px 10px', borderRadius: 7, background: bg, border: `1px solid ${border}`, marginTop: 4, fontSize: 12 }}>
      <Icon size={13} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
      <span style={{ color }}>{action.message}</span>
    </div>
  );
}

// ─── Pending confirmation card ────────────────────────────────────────────────

function PendingActions({ tools, onConfirm, onDecline, T }) {
  return (
    <div style={{ padding: '12px 14px', borderRadius: 10, background: T.amberBg, border: `1px solid ${T.amberBorder}`, marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <AlertTriangle size={14} color={T.amber} />
        <span style={{ fontSize: 12, fontWeight: 700, color: T.amber }}>Confirm {tools.length} action{tools.length > 1 ? 's' : ''}</span>
      </div>
      {tools.map((t, i) => (
        <div key={i} style={{ fontSize: 12, color: T.text1, padding: '4px 0', borderBottom: i < tools.length - 1 ? `1px solid ${T.amberBorder}` : 'none' }}>
          {describeToolCall(t.name, t.input)}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={onConfirm} style={{ flex: 1, padding: '7px 0', borderRadius: 7, fontSize: 12, fontWeight: 700, color: 'white', background: T.green, border: 'none', cursor: 'pointer' }}>
          ✓ Confirm
        </button>
        <button onClick={onDecline} style={{ flex: 1, padding: '7px 0', borderRadius: 7, fontSize: 12, fontWeight: 700, color: T.red, background: T.redBg, border: `1px solid ${T.redBorder}`, cursor: 'pointer' }}>
          ✗ Decline
        </button>
      </div>
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, T, onNavigate, onConfirm, onDecline }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
      {/* Avatar */}
      <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isUser ? T.accent : T.bg4, border: `1px solid ${isUser ? T.accent : T.border2}` }}>
        {isUser ? <User size={14} color="white" /> : <Bot size={14} color={T.accent} />}
      </div>
      {/* Content */}
      <div style={{ maxWidth: '82%' }}>
        {msg.docContext && (
          <div style={{ fontSize: 11, color: T.text3, marginBottom: 4, fontStyle: 'italic' }}>
            📎 {msg.docContext}
          </div>
        )}
        <div style={{
          padding: '10px 14px', borderRadius: isUser ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
          background: isUser ? T.accent : T.bg3,
          border: `1px solid ${isUser ? T.accent : T.border1}`,
          fontSize: 13, lineHeight: 1.6, color: isUser ? 'white' : T.text0,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {msg.text || <span style={{ color: T.text3, fontStyle: 'italic' }}>…</span>}
          {msg.streaming && (
            <span style={{ display: 'inline-block', width: 8, height: 13, background: T.accent, marginLeft: 2, borderRadius: 2, animation: 'blink 1s step-end infinite' }} />
          )}
        </div>
        {/* Executed actions */}
        {(msg.actions || []).map((a, i) => <ActionChip key={i} action={a} T={T} />)}
        {/* Pending confirmation */}
        {msg.pendingTools && !msg.pendingResolved && (
          <PendingActions tools={msg.pendingTools} T={T} onConfirm={onConfirm} onDecline={onDecline} />
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AssistantPanel({ shipments = [], projects = [], quotes = [], rates = {}, isDark = true, onClose, onNavigate, onDataChange, selectedShipment = null }) {
  const T = getT(isDark);
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState('');
  const [busy, setBusy]               = useState(false);
  const [confirmMode, setConfirmMode] = useState(getConfirmMode());
  const [dragOver, setDragOver]       = useState(false);
  const [pendingDoc, setPendingDoc]   = useState(null);
  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);
  const historyRef  = useRef([]);

  const workerUrl = getAiWorkerUrl();
  const hasWorker = !!workerUrl;
  const pendingDocSaveRef = useRef(null); // stores doc metadata to save when shipment opens

  // Save pending document (and apply booking data) as soon as selectedShipment becomes available
  useEffect(() => {
    if (!selectedShipment || !pendingDocSaveRef.current) return;
    const docToSave = { ...pendingDocSaveRef.current };
    const bookingAnalysis = pendingDocSaveRef._bookingAnalysis || null;
    pendingDocSaveRef.current = null;
    pendingDocSaveRef._bookingAnalysis = null;

    import('../db/schema.js').then(async ({ addDocument: addDoc, addActivity: addAct, updateShipment: updateS, getShipment: getS }) => {
      try {
        await addDoc({ id: crypto.randomUUID(), shipmentId: selectedShipment.id, ...docToSave });
        if (bookingAnalysis?.isBookingConfirmation && bookingAnalysis.shipmentUpdates) {
          const { applyBookingToShipment } = await import('../parsers/documentIntelligence.js');
          const current = await getS(selectedShipment.id);
          if (current) {
            const updated = applyBookingToShipment(current, bookingAnalysis.shipmentUpdates);
            const { _parsedBooking, ...saveData } = updated;
            await updateS(selectedShipment.id, { ...saveData, parsedBooking: bookingAnalysis.bookingData, updatedAt: new Date().toISOString() });
            const ms = bookingAnalysis.shipmentUpdates.milestones || [];
            await addAct({ id: crypto.randomUUID(), type: 'document', message: `Booking applied via AI: ${docToSave.name}${ms.length ? ` — ${ms.length} deadlines added` : ''}`, shipmentId: selectedShipment.id, timestamp: new Date().toISOString() });
          }
        } else {
          await addAct({ id: crypto.randomUUID(), type: 'document', message: `Document attached via AI: ${docToSave.name}`, shipmentId: selectedShipment.id, timestamp: new Date().toISOString() });
        }
        if (onDataChange) onDataChange();
      } catch (err) { console.error('pendingDocSave failed:', err); }
    });
  }, [selectedShipment?.id]);

  // Scroll to bottom on new messages
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  function toggleConfirmMode() {
    const next = !confirmMode;
    setConfirmMode(next);
    saveConfirmMode(next);
  }

  // ─── Document drop ──────────────────────────────────────────────────────────

  async function handleFile(file) {
    const name = file.name.toLowerCase();
    try {
      if (name.endsWith('.pdf')) {
        const rawText = await extractTextFromPDF(file);
        const analysis = processPdfText(rawText?.text || rawText, null);
        let summary = `PDF: ${file.name}`;
        if (analysis.isBookingConfirmation && analysis.bookingData) {
          const b = analysis.bookingData;
          summary = `Booking confirmation from ${b.carrier || 'carrier'}: ${b.origin || '?'} → ${b.destination || '?'}`;
        }
        const textContent = rawText?.text || rawText || '';
        setPendingDoc({ name: file.name, text: textContent, summary });

        // Store for saving when Claude navigates to a shipment
        pendingDocSaveRef.current = {
          name: file.name,
          type: analysis.isBookingConfirmation ? 'booking_confirmation' : 'document',
          date: new Date().toISOString().split('T')[0],
          quoteNumber: analysis.bookingData?.references?.quotationNumber || null,
          bookingNumber: analysis.bookingData?.references?.bookingReference || analysis.bookingData?.references?.ourReference || null,
        };
        // Also store the full analysis so useEffect can apply milestones on navigation
        pendingDocSaveRef._bookingAnalysis = analysis.isBookingConfirmation ? analysis : null;

        // If a shipment is already open AND this is a booking, apply full data (milestones, fields)
        if (selectedShipment) {
          try {
            const { addDocument: addDoc, addActivity: addAct, updateShipment: updateS, getShipment: getS } = await import('../db/schema.js');
            const { applyBookingToShipment } = await import('../parsers/documentIntelligence.js');
            // Save document record
            await addDoc({ id: crypto.randomUUID(), shipmentId: selectedShipment.id, ...pendingDocSaveRef.current });
            // Apply booking fields + milestones if it's a booking confirmation
            if (analysis.isBookingConfirmation && analysis.shipmentUpdates) {
              const current = await getS(selectedShipment.id);
              if (current) {
                const updated = applyBookingToShipment(current, analysis.shipmentUpdates);
                const { _parsedBooking, ...saveData } = updated;
                await updateS(selectedShipment.id, { ...saveData, parsedBooking: analysis.bookingData, updatedAt: new Date().toISOString() });
                const ms = analysis.shipmentUpdates.milestones || [];
                await addAct({ id: crypto.randomUUID(), type: 'document', message: `Booking applied via AI: ${file.name}${ms.length ? ` — ${ms.length} deadlines added` : ''}`, shipmentId: selectedShipment.id, timestamp: new Date().toISOString() });
              }
            } else {
              await addAct({ id: crypto.randomUUID(), type: 'document', message: `Document attached via AI: ${file.name}`, shipmentId: selectedShipment.id, timestamp: new Date().toISOString() });
            }
            pendingDocSaveRef.current = null;
            if (onDataChange) onDataChange();
          } catch (err) { console.error('Could not apply booking from AI panel:', err); }
        }

      } else if (name.endsWith('.msg')) {
        const msg = await processMsgFile(file);
        if (msg) {
          const body = msg.bodyText || '';
          setPendingDoc({ name: file.name, text: `Subject: ${msg.subject}\nFrom: ${msg.sender}\n\n${body}`, summary: `Email: ${msg.subject}` });
          pendingDocSaveRef.current = { name: file.name, type: 'email', date: new Date().toISOString().split('T')[0] };
          if (selectedShipment) {
            try {
              const { addDocument: addDoc } = await import('../db/schema.js');
              await addDoc({ id: crypto.randomUUID(), shipmentId: selectedShipment.id, ...pendingDocSaveRef.current });
              pendingDocSaveRef.current = null;
              if (onDataChange) onDataChange();
            } catch {}
          }
        }
      } else {
        setPendingDoc({ name: file.name, text: '', summary: `File: ${file.name} (unsupported type — describe what to do)` });
      }
    } catch (err) {
      setPendingDoc({ name: file.name, text: '', summary: `File: ${file.name} (could not parse)` });
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = Array.from(e.dataTransfer.files)[0];
    if (file) handleFile(file);
  }

  // ─── Core send logic ────────────────────────────────────────────────────────

  const send = useCallback(async (userText) => {
    const workerUrl = getAiWorkerUrl();
    if (!workerUrl) {
      setMessages(m => [...m, { role: 'assistant', text: '⚠️ No AI worker URL set. Add it in Settings → AI Assistant.', id: crypto.randomUUID() }]);
      return;
    }

    const docCtx = pendingDoc;
    setPendingDoc(null);
    setInput('');
    setBusy(true);

    // Build user content — append doc text if present
    let userContent = userText;
    if (docCtx?.text) {
      userContent = `${userText}\n\n--- Attached document: ${docCtx.name} ---\n${docCtx.text.slice(0, 8000)}`;
    }

    // Add user message to UI
    const userMsgId = crypto.randomUUID();
    setMessages(m => [...m, { role: 'user', text: userText, docContext: docCtx?.summary, id: userMsgId }]);

    // Build Anthropic history
    const history = [...historyRef.current, { role: 'user', content: userContent }];
    const systemPrompt = buildSystemPrompt(shipments, projects, quotes, rates);

    // Placeholder assistant message for streaming
    const asstMsgId = crypto.randomUUID();
    setMessages(m => [...m, { role: 'assistant', text: '', streaming: true, id: asstMsgId }]);

    try {
      let streamedText = '';
      let toolCalls = [];

      // ── First stream pass ─────────────────────────────────────────────────
      await streamRequest(
        workerUrl, history, systemPrompt,
        (chunk) => {
          streamedText += chunk;
          setMessages(m => m.map(msg => msg.id === asstMsgId ? { ...msg, text: streamedText } : msg));
        },
        (tools) => { toolCalls = tools; }
      );

      // Stop streaming cursor
      setMessages(m => m.map(msg => msg.id === asstMsgId ? { ...msg, streaming: false } : msg));

      // If no tool calls: done
      if (toolCalls.length === 0) {
        historyRef.current = [...history, { role: 'assistant', content: streamedText }];
        setBusy(false);
        return;
      }

      // Build assistant message with tool_use for history
      const assistantHistoryMsg = {
        role: 'assistant',
        content: [
          ...(streamedText ? [{ type: 'text', text: streamedText }] : []),
          ...toolCalls.map(t => ({ type: 'tool_use', id: t.id, name: t.name, input: t.input })),
        ],
      };

      // ── Confirm mode: show pending, wait for user ─────────────────────────
      if (confirmMode) {
        setMessages(m => m.map(msg => msg.id === asstMsgId
          ? { ...msg, pendingTools: toolCalls, pendingResolved: false }
          : msg));
        setBusy(false);

        // Store partial history for after confirmation
        historyRef.current = [...history, assistantHistoryMsg];
        // pendingTools state lives in the message — confirmPending/declinePending read from it
        return;
      }

      // ── Auto-execute tools ────────────────────────────────────────────────
      await executeAndFollowUp(toolCalls, history, assistantHistoryMsg, asstMsgId, systemPrompt);

    } catch (err) {
      console.error('AI error:', err);
      setMessages(m => m.map(msg => msg.id === asstMsgId
        ? { ...msg, text: `⚠️ Error: ${err.message}`, streaming: false }
        : msg));
      setBusy(false);
    }
  }, [shipments, projects, quotes, rates, confirmMode, pendingDoc]);

  // ─── Execute tools and stream follow-up ──────────────────────────────────────

  async function executeAndFollowUp(toolCalls, history, assistantHistoryMsg, asstMsgId, systemPrompt) {
    const results = [];
    const actions = [];

    for (const tool of toolCalls) {
      const docSave = pendingDocSaveRef.current;
      const result = await executeTool(tool.name, tool.input, onNavigate, docSave);
      // Clear the pending doc save after navigate_to_shipment consumed it
      if (tool.name === 'navigate_to_shipment' && docSave) {
        pendingDocSaveRef.current = null;
        if (onDataChange) onDataChange();
      }
      results.push({ tool_use_id: tool.id, ...result });
      actions.push(result);
    }

    // Show executed actions on the message
    setMessages(m => m.map(msg => msg.id === asstMsgId
      ? { ...msg, actions, pendingResolved: true }
      : msg));

    // Reload UI data after mutations
    if (actions.some(a => a.success)) onDataChange?.();

    // Build tool_results user message
    const toolResultMsg = {
      role: 'user',
      content: results.map(r => ({
        type: 'tool_result',
        tool_use_id: r.tool_use_id,
        content: r.message,
      })),
    };

    const newHistory = [...history, assistantHistoryMsg, toolResultMsg];

    // ── Second stream pass (follow-up after tools) ─────────────────────────
    const followUpId = crypto.randomUUID();
    setMessages(m => [...m, { role: 'assistant', text: '', streaming: true, id: followUpId }]);

    let followUpText = '';
    try {
      await streamRequest(
        getAiWorkerUrl(), newHistory, systemPrompt,
        (chunk) => {
          followUpText += chunk;
          setMessages(m => m.map(msg => msg.id === followUpId ? { ...msg, text: followUpText } : msg));
        },
        () => {} // no tools expected in follow-up
      );
      setMessages(m => m.map(msg => msg.id === followUpId ? { ...msg, streaming: false } : msg));
      historyRef.current = [...newHistory, { role: 'assistant', content: followUpText }];
    } catch (err) {
      setMessages(m => m.map(msg => msg.id === followUpId ? { ...msg, text: '(follow-up failed)', streaming: false } : msg));
    }

    setBusy(false);
  }

  // ─── Confirm / decline pending tools ─────────────────────────────────────────

  async function confirmPending(asstMsgId) {
    const msg = messages.find(m => m.id === asstMsgId);
    if (!msg?.pendingTools) return;

    setBusy(true);
    setMessages(m => m.map(x => x.id === asstMsgId ? { ...x, pendingResolved: true } : x));

    const history = historyRef.current;
    const assistantHistoryMsg = history[history.length - 1]; // already stored
    const prevHistory = history.slice(0, -1);
    const systemPrompt = buildSystemPrompt(shipments, projects, quotes, rates);

    await executeAndFollowUp(msg.pendingTools, prevHistory, assistantHistoryMsg, asstMsgId, systemPrompt);
  }

  async function declinePending(asstMsgId) {
    const msg = messages.find(m => m.id === asstMsgId);
    if (!msg?.pendingTools) return;

    setMessages(m => m.map(x => x.id === asstMsgId
      ? { ...x, pendingResolved: true, actions: [{ success: false, message: 'Actions declined by user' }] }
      : x));

    // Tell Claude the tools were declined
    const history = historyRef.current;
    const assistantHistoryMsg = history[history.length - 1];
    const prevHistory = history.slice(0, -1);
    const toolResultMsg = {
      role: 'user',
      content: msg.pendingTools.map(t => ({
        type: 'tool_result',
        tool_use_id: t.id,
        content: 'User declined this action.',
      })),
    };

    const newHistory = [...prevHistory, assistantHistoryMsg, toolResultMsg];
    historyRef.current = newHistory;

    const followUpId = crypto.randomUUID();
    const systemPrompt = buildSystemPrompt(shipments, projects, quotes, rates);
    setBusy(true);
    setMessages(m => [...m, { role: 'assistant', text: '', streaming: true, id: followUpId }]);

    let txt = '';
    try {
      await streamRequest(getAiWorkerUrl(), newHistory, systemPrompt,
        chunk => { txt += chunk; setMessages(m => m.map(x => x.id === followUpId ? { ...x, text: txt } : x)); },
        () => {}
      );
    } catch {}
    setMessages(m => m.map(x => x.id === followUpId ? { ...x, streaming: false } : x));
    historyRef.current = [...newHistory, { role: 'assistant', content: txt }];
    setBusy(false);
  }

  // ─── Submit ──────────────────────────────────────────────────────────────────

  function handleSubmit() {
    const text = input.trim();
    if (!text && !pendingDoc) return;
    if (busy) return;
    send(text || `Process this document: ${pendingDoc?.name}`);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: 420, zIndex: 250,
      display: 'flex', flexDirection: 'column',
      background: T.bg1, borderLeft: `1px solid ${T.border1}`,
      boxShadow: `-8px 0 40px ${T.shadowHeavy}`,
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes spin   { to{transform:rotate(360deg)} }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${T.border1}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: T.accentGlow, border: `1px solid rgba(59,130,246,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={15} color={T.accent} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text0 }}>AI Assistant</div>
            <div style={{ fontSize: 10, color: T.text3 }}>Claude · CargoDesk</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Confirm mode toggle */}
          <button
            onClick={toggleConfirmMode}
            title={confirmMode ? 'Confirm mode ON — click to auto-execute' : 'Auto-execute mode — click to require confirmation'}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${confirmMode ? T.amberBorder : T.border1}`, background: confirmMode ? T.amberBg : T.bg3, color: confirmMode ? T.amber : T.text3 }}
          >
            {confirmMode ? <><AlertTriangle size={11} /> Confirm mode</> : <><Zap size={11} /> Auto-execute</>}
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.text3, cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{ flex: 1, overflowY: 'auto', padding: '16px 14px' }}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {messages.length === 0 && (
          <div style={{ padding: '24px 16px', color: T.text3 }}>

            {/* No worker URL warning */}
            {!hasWorker && (
              <div style={{ padding: '12px 14px', borderRadius: 10, background: T.amberBg, border: `1px solid ${T.amberBorder}`, marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <AlertTriangle size={15} color={T.amber} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.amber, marginBottom: 4 }}>AI worker not configured</div>
                  <div style={{ fontSize: 12, color: T.amber, opacity: 0.85, lineHeight: 1.6 }}>
                    Go to <strong>Settings → AI Assistant</strong> and paste your Cloudflare Worker URL to get started.
                  </div>
                  <button onClick={onClose} style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, color: T.amber, background: 'transparent', border: `1px solid ${T.amberBorder}`, cursor: 'pointer' }}>
                    <Settings size={11} /> Open Settings
                  </button>
                </div>
              </div>
            )}

            {/* Greeting */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <Bot size={28} color={T.border2} style={{ marginBottom: 10 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text2, marginBottom: 6 }}>How can I help?</div>
              <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                Ask questions, create records, or drop a document.
              </div>
            </div>

            {/* Context-aware prompts */}
            <div style={{ marginBottom: 10, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.text3 }}>
              {selectedShipment ? `Suggestions for ${selectedShipment.ref || selectedShipment.customerRef || 'this shipment'}` : 'Suggestions'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {(selectedShipment ? [
                `What is the current status of ${selectedShipment.ref || selectedShipment.customerRef}?`,
                `Are there any overdue milestones on ${selectedShipment.ref || selectedShipment.customerRef}?`,
                `Write a customer status update for ${selectedShipment.customerRef || selectedShipment.ref}`,
                `What is the margin on ${selectedShipment.ref || selectedShipment.customerRef}?`,
              ] : [
                "What's the status of all active shipments?",
                "Which shipments have overdue milestones?",
                "Which delivered shipments have billing pending?",
                "What's the total margin across all projects?",
                "Write a customer status update for the USGOLD project",
                "Create a shipment Helsinki → Houston, 1×40HC",
              ]).map(s => (
                <button key={s} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  style={{ padding: '7px 12px', borderRadius: 8, fontSize: 12, color: T.accent, background: T.accentGlow, border: `1px solid rgba(59,130,246,0.2)`, cursor: 'pointer', textAlign: 'left', lineHeight: 1.4 }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <MessageBubble
            key={msg.id} msg={msg} T={T}
            onNavigate={onNavigate}
            onConfirm={() => confirmPending(msg.id)}
            onDecline={() => declinePending(msg.id)}
          />
        ))}

        {/* Drag over overlay */}
        {dragOver && (
          <div style={{ position: 'absolute', inset: 0, background: `${T.accent}18`, border: `2px dashed ${T.accent}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.accent }}>Drop document to attach</div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Pending doc chip */}
      {pendingDoc && (
        <div style={{ margin: '0 14px 6px', padding: '8px 12px', borderRadius: 8, background: T.bg3, border: `1px solid ${T.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.text1, minWidth: 0 }}>
            <Paperclip size={12} color={T.accent} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pendingDoc.summary}</span>
          </div>
          <button onClick={() => setPendingDoc(null)} style={{ background: 'none', border: 'none', color: T.text3, cursor: 'pointer', padding: 0, flexShrink: 0 }}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* Input area */}
      <div style={{ padding: '10px 14px 14px', borderTop: `1px solid ${T.border1}`, flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 8,
          background: T.bg3, borderRadius: 12,
          border: `1px solid ${T.border2}`, padding: '8px 12px',
        }}>
          {/* File attach button */}
          <label style={{ cursor: 'pointer', color: T.text3, padding: '2px 0', flexShrink: 0 }} title="Attach document">
            <input type="file" accept=".pdf,.msg" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
            <Paperclip size={16} />
          </label>

          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything, or drop a document…"
            rows={1}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              resize: 'none', fontSize: 13, color: T.text0, lineHeight: 1.5,
              maxHeight: 120, overflowY: 'auto',
              fontFamily: "'Inter', -apple-system, sans-serif",
            }}
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />

          <button
            onClick={handleSubmit}
            disabled={busy || (!input.trim() && !pendingDoc)}
            style={{
              width: 30, height: 30, borderRadius: 8, border: 'none',
              background: (busy || (!input.trim() && !pendingDoc)) ? T.bg4 : T.accent,
              color: (busy || (!input.trim() && !pendingDoc)) ? T.text3 : 'white',
              cursor: (busy || (!input.trim() && !pendingDoc)) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            {busy
              ? <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
              : <Send size={14} />}
          </button>
        </div>
        <div style={{ fontSize: 10, color: T.text3, textAlign: 'center', marginTop: 6 }}>
          Enter to send · Shift+Enter for new line · Drop files to attach
        </div>
      </div>
    </div>
  );
}
