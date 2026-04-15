import { useState } from "react";
import { Download, Upload, Trash2, AlertTriangle, CheckCircle2, Shield, X, RefreshCw, Navigation, Bot, Database, Cloud, HardDrive } from "lucide-react";
import { exportData, importData, resetDB, getMode, setMode, getDbSource, setDbSource } from "../db/schema.js";
import { getWorkerUrl, setWorkerUrl } from "../utils/tracking.js";
import { getAiWorkerUrl, setAiWorkerUrl } from "../utils/assistantContext.js";
import { getAppwriteConfig, setAppwriteConfig, testConnection, migrateFromLocal, resetClient } from "../db/appwrite.js";

export default function SettingsPanel({ T, onClose, onModeChange, onDataChange }) {
  const [activeSection, setActiveSection] = useState("mode");
  const [exportPassword, setExportPassword] = useState("");
  const [importPassword, setImportPassword] = useState("");
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Tracking worker
  const [workerUrlInput, setWorkerUrlInput] = useState(getWorkerUrl());
  const [workerTestResult, setWorkerTestResult] = useState(null);

  // AI worker
  const [aiWorkerUrl, setAiWorkerUrlInput] = useState(getAiWorkerUrl());
  const [aiTestResult, setAiTestResult] = useState(null);
  const [aiTesting, setAiTesting] = useState(false);

  // Database / Appwrite
  const awCfg = getAppwriteConfig();
  const [dbSource, setDbSourceState] = useState(getDbSource());
  const [awEndpoint,   setAwEndpoint]   = useState(awCfg.endpoint);
  const [awProjectId,  setAwProjectId]  = useState(awCfg.projectId);
  const [awDatabaseId, setAwDatabaseId] = useState(awCfg.databaseId);
  const [dbTestResult, setDbTestResult] = useState(null);
  const [dbTesting,    setDbTesting]    = useState(false);
  const [migrating,    setMigrating]    = useState(false);

  const currentMode = getMode();

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 14,
    border: `1px solid ${T.border1}`, background: T.bg3, color: T.text0, outline: "none",
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleModeSwitch = (newMode) => {
    if (newMode === currentMode) return;
    setMode(newMode);
    if (onModeChange) onModeChange(newMode);
  };

  const handleExport = async () => {
    setProcessing(true);
    try {
      const result = await exportData(exportPassword || null);
      const blob = new Blob([result], { type: exportPassword ? "text/plain" : "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cargodesk-backup-${new Date().toISOString().slice(0, 10)}${exportPassword ? ".enc" : ".json"}`;
      a.click();
      URL.revokeObjectURL(url);
      showMessage("success", "Backup downloaded successfully.");
    } catch (err) {
      showMessage("error", `Export failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!importText.trim()) { showMessage("error", "Paste backup data first."); return; }
    setProcessing(true);
    try {
      const result = await importData(importText.trim(), importPassword || null);
      showMessage("success", `Restored: ${result.projects} projects, ${result.shipments} shipments, ${result.documents} documents.`);
      setImportText(""); setImportPassword("");
      if (onDataChange) onDataChange();
    } catch (err) {
      showMessage("error", `Import failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = async () => {
    setProcessing(true);
    try {
      await resetDB();
      showMessage("success", "Database reset successfully.");
      setConfirmReset(false);
      if (onDataChange) onDataChange();
    } catch (err) {
      showMessage("error", `Reset failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // ── Tracking worker ──────────────────────────────────────────────────────────

  const handleSaveWorkerUrl = () => {
    setWorkerUrl(workerUrlInput.trim());
    showMessage("success", "Tracking worker URL saved.");
    setWorkerTestResult(null);
  };

  const handleTestWorker = async () => {
    const url = workerUrlInput.trim();
    if (!url) { setWorkerTestResult({ ok: false, message: "Enter a worker URL first." }); return; }
    setWorkerTestResult({ ok: null, message: "Testing…" });
    try {
      const res = await fetch(`${url}?test=ping`, { method: "GET" });
      if (res.ok || res.status === 405) {
        setWorkerTestResult({ ok: true, message: "Worker is reachable." });
      } else {
        setWorkerTestResult({ ok: false, message: `Worker returned status ${res.status}.` });
      }
    } catch {
      setWorkerTestResult({ ok: false, message: "Could not reach worker. Check the URL." });
    }
  };

  // ── AI worker ────────────────────────────────────────────────────────────────

  const handleSaveAiUrl = () => {
    setAiWorkerUrl(aiWorkerUrl.trim());
    showMessage("success", "AI worker URL saved.");
    setAiTestResult(null);
  };

  const handleTestAiWorker = async () => {
    const url = aiWorkerUrl.trim();
    if (!url) { setAiTestResult({ ok: false, message: "Enter a worker URL first." }); return; }
    setAiTesting(true);
    setAiTestResult({ ok: null, message: "Testing…" });
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 10,
          messages: [{ role: "user", content: "Hi" }],
        }),
      });
      if (res.ok) {
        setAiTestResult({ ok: true, message: "Connected successfully — AI is ready." });
      } else {
        const text = await res.text();
        let detail = `Status ${res.status}`;
        try { detail = JSON.parse(text)?.error?.message || detail; } catch {}
        setAiTestResult({ ok: false, message: `Worker error: ${detail}` });
      }
    } catch (err) {
      setAiTestResult({ ok: false, message: `Could not reach worker: ${err.message}` });
    } finally {
      setAiTesting(false);
    }
  };

  // ── Database handlers ────────────────────────────────────────────────────────

  const handleSaveDbConfig = () => {
    setAppwriteConfig({ endpoint: awEndpoint.trim(), projectId: awProjectId.trim(), databaseId: awDatabaseId.trim() });
    resetClient();
    showMessage("success", "Appwrite config saved.");
    setDbTestResult(null);
  };

  const handleTestDb = async () => {
    setDbTesting(true);
    setDbTestResult({ ok: null, message: "Testing…" });
    const result = await testConnection();
    setDbTestResult(result);
    setDbTesting(false);
  };

  const handleSwitchSource = async (source) => {
    setDbSource(source);
    setDbSourceState(source);
    if (onDataChange) onDataChange();
    showMessage("success", `Switched to ${source === 'cloud' ? 'Appwrite cloud' : 'local IndexedDB'}.`);
  };

  const handleMigrate = async () => {
    setMigrating(true);
    showMessage("success", "Migration started…");
    try {
      // Read from local IndexedDB
      const { getDB } = await import("../db/schema.js");
      const db = getDB();
      const localData = {
        projects:   await db.projects.toArray(),
        shipments:  await db.shipments.toArray(),
        activities: await db.activities.toArray(),
        templates:  await db.templates.toArray(),
        quotes:     db.quotes ? await db.quotes.toArray() : [],
      };
      const results = await migrateFromLocal(localData);
      if (results.errors.length > 0) {
        showMessage("error",
          `Migrated ${results.shipments} shipments, ${results.projects} projects — but ${results.errors.length} errors: ${results.errors.slice(0,3).join(' | ')}`
        );
      } else {
        showMessage("success",
          `Migrated: ${results.projects} projects, ${results.shipments} shipments, ${results.activities} activities, ${results.templates} templates, ${results.quotes} quotes.`
        );
      }
    } catch (err) {
      showMessage("error", `Migration failed: ${err.message}`);
    } finally {
      setMigrating(false);
    }
  };

  // ── Sections ─────────────────────────────────────────────────────────────────

  const sections = [
    { id: "mode",     label: "Mode"         },
    { id: "database", label: "Database"     },
    { id: "ai",       label: "AI Assistant" },
    { id: "tracking", label: "Tracking"     },
    { id: "backup",   label: "Backup"       },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", width: 580, maxHeight: "88vh", overflow: "auto", background: T.bg2, borderRadius: 16, border: `1px solid ${T.border1}`, boxShadow: `0 24px 80px ${T.shadowHeavy}` }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: `1px solid ${T.border1}`, position: "sticky", top: 0, background: T.bg2, zIndex: 1, borderRadius: "16px 16px 0 0" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text0 }}>Settings</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.text2, cursor: "pointer", padding: 4 }}><X size={20} /></button>
        </div>

        {/* Nav tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${T.border1}`, padding: "0 24px" }}>
          {sections.map(s => (
            <div key={s.id} onClick={() => setActiveSection(s.id)}
              style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: activeSection === s.id ? T.accent : T.text2, borderBottom: `2px solid ${activeSection === s.id ? T.accent : "transparent"}`, transition: "color 0.15s" }}>
              {s.label}
            </div>
          ))}
        </div>

        <div style={{ padding: "24px" }}>

          {/* Message banner */}
          {message && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, marginBottom: 20, background: message.type === "success" ? T.greenBg : T.redBg, border: `1px solid ${message.type === "success" ? T.greenBorder : T.redBorder}`, color: message.type === "success" ? T.green : T.red, fontSize: 13 }}>
              {message.type === "success" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
              {message.text}
            </div>
          )}

          {/* ── MODE ── */}
          {activeSection === "mode" && (
            <div>
              <div style={{ fontSize: 14, color: T.text1, marginBottom: 20, lineHeight: 1.6 }}>
                CargoDesk uses separate databases for Test and Production. Switch modes to work with test data without affecting real shipments.
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {["test", "production"].map(mode => (
                  <div key={mode} onClick={() => handleModeSwitch(mode)}
                    style={{ flex: 1, padding: 16, borderRadius: 10, cursor: "pointer", textAlign: "center", background: currentMode === mode ? T.accentGlow : T.bg3, border: `1px solid ${currentMode === mode ? T.accent : T.border1}`, transition: "all 0.15s" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: currentMode === mode ? T.accent : T.text1, textTransform: "capitalize", marginBottom: 4 }}>{mode}</div>
                    <div style={{ fontSize: 12, color: T.text3 }}>{mode === "test" ? "Safe sandbox with seed data" : "Your real shipment data"}</div>
                    {currentMode === mode && <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, marginTop: 6 }}>● ACTIVE</div>}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: T.bg3, border: `1px solid ${T.border1}`, fontSize: 12, color: T.text3 }}>
                Switching modes instantly loads the other database. No data is shared or lost when switching.
              </div>
            </div>
          )}

          {/* ── DATABASE ── */}
          {activeSection === "database" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <Database size={18} color={T.accent} />
                <div style={{ fontSize: 14, color: T.text1 }}>
                  Switch between local IndexedDB and Appwrite cloud storage.
                </div>
              </div>

              {/* Source toggle */}
              <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                {[
                  { id: "local", label: "Local", sub: "IndexedDB in this browser", icon: HardDrive },
                  { id: "cloud", label: "Cloud", sub: "Appwrite — synced across devices", icon: Cloud },
                ].map(opt => (
                  <div key={opt.id} onClick={() => handleSwitchSource(opt.id)}
                    style={{ flex: 1, padding: 16, borderRadius: 10, cursor: "pointer", textAlign: "center",
                      background: dbSource === opt.id ? T.accentGlow : T.bg3,
                      border: `1px solid ${dbSource === opt.id ? T.accent : T.border1}`,
                      transition: "all 0.15s" }}>
                    <opt.icon size={20} color={dbSource === opt.id ? T.accent : T.text3} style={{ marginBottom: 6 }} />
                    <div style={{ fontSize: 14, fontWeight: 700, color: dbSource === opt.id ? T.accent : T.text1 }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>{opt.sub}</div>
                    {dbSource === opt.id && <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, marginTop: 6 }}>● ACTIVE</div>}
                  </div>
                ))}
              </div>

              {/* Appwrite config */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 6 }}>API Endpoint</label>
                <input value={awEndpoint} onChange={e => setAwEndpoint(e.target.value)} style={inputStyle} placeholder="https://fra.cloud.appwrite.io/v1" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 6 }}>Project ID</label>
                <input value={awProjectId} onChange={e => setAwProjectId(e.target.value)} style={{ ...inputStyle, fontFamily: "monospace" }} placeholder="69ddec6f0027dd4d58a2" />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 6 }}>Database ID</label>
                <input value={awDatabaseId} onChange={e => setAwDatabaseId(e.target.value)} style={{ ...inputStyle, fontFamily: "monospace" }} placeholder="69ddf5d500320ffd383d" />
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                <button onClick={handleSaveDbConfig}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "white", background: T.accent, border: "none", cursor: "pointer" }}>
                  <CheckCircle2 size={14} /> Save Config
                </button>
                <button onClick={handleTestDb} disabled={dbTesting}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: T.text1, background: T.bg3, border: `1px solid ${T.border1}`, cursor: dbTesting ? "not-allowed" : "pointer", opacity: dbTesting ? 0.6 : 1 }}>
                  <RefreshCw size={14} style={{ animation: dbTesting ? "spin 0.8s linear infinite" : "none" }} />
                  {dbTesting ? "Testing…" : "Test Connection"}
                </button>
                <button onClick={handleMigrate} disabled={migrating}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: T.amber, background: T.amberBg, border: `1px solid ${T.amberBorder}`, cursor: migrating ? "not-allowed" : "pointer", opacity: migrating ? 0.6 : 1 }}>
                  <Upload size={14} /> {migrating ? "Migrating…" : "Migrate Local → Cloud"}
                </button>
              </div>

              {dbTestResult && (
                <div style={{ padding: 12, borderRadius: 8, display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
                  background: dbTestResult.ok === true ? T.greenBg : dbTestResult.ok === false ? T.redBg : T.bg3,
                  border: `1px solid ${dbTestResult.ok === true ? T.greenBorder : dbTestResult.ok === false ? T.redBorder : T.border1}`,
                  color: dbTestResult.ok === true ? T.green : dbTestResult.ok === false ? T.red : T.text2, fontSize: 13 }}>
                  {dbTestResult.ok === true  && <CheckCircle2 size={15} />}
                  {dbTestResult.ok === false && <AlertTriangle size={15} />}
                  {dbTestResult.ok === null  && <RefreshCw size={15} />}
                  {dbTestResult.message}
                </div>
              )}

              <div style={{ padding: 12, borderRadius: 8, background: T.bg3, border: `1px solid ${T.border1}`, fontSize: 12, color: T.text3, lineHeight: 1.7 }}>
                <strong style={{ color: T.text2 }}>To migrate:</strong> Save config → Test Connection → click Migrate Local → Cloud → switch to Cloud mode.
              </div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* ── AI ASSISTANT ── */}
          {activeSection === "ai" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Bot size={18} color={T.accent} />
                <div style={{ fontSize: 14, color: T.text1 }}>
                  Configure the Cloudflare Worker that proxies requests to the Anthropic API.
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 6 }}>
                  AI Worker URL
                </label>
                <input
                  type="url"
                  value={aiWorkerUrl}
                  onChange={e => setAiWorkerUrlInput(e.target.value)}
                  placeholder="https://cargodesk-ai.your-subdomain.workers.dev"
                  style={inputStyle}
                />
                <div style={{ fontSize: 12, color: T.text3, marginTop: 4 }}>
                  The URL of your deployed Cloudflare Worker (cargodesk-ai).
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <button onClick={handleSaveAiUrl}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "white", background: T.accent, border: "none", cursor: "pointer" }}>
                  <CheckCircle2 size={14} /> Save
                </button>
                <button onClick={handleTestAiWorker} disabled={aiTesting}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: T.text1, background: T.bg3, border: `1px solid ${T.border1}`, cursor: aiTesting ? "not-allowed" : "pointer", opacity: aiTesting ? 0.6 : 1 }}>
                  <RefreshCw size={14} style={{ animation: aiTesting ? "spin 0.8s linear infinite" : "none" }} />
                  {aiTesting ? "Testing…" : "Test Connection"}
                </button>
              </div>

              {aiTestResult && (
                <div style={{ padding: 12, borderRadius: 8, display: "flex", alignItems: "center", gap: 8, marginBottom: 16, background: aiTestResult.ok === true ? T.greenBg : aiTestResult.ok === false ? T.redBg : T.bg3, border: `1px solid ${aiTestResult.ok === true ? T.greenBorder : aiTestResult.ok === false ? T.redBorder : T.border1}`, color: aiTestResult.ok === true ? T.green : aiTestResult.ok === false ? T.red : T.text2, fontSize: 13 }}>
                  {aiTestResult.ok === true && <CheckCircle2 size={15} />}
                  {aiTestResult.ok === false && <AlertTriangle size={15} />}
                  {aiTestResult.ok === null && <RefreshCw size={15} />}
                  {aiTestResult.message}
                </div>
              )}

              <div style={{ padding: 14, borderRadius: 10, background: T.bg3, border: `1px solid ${T.border1}`, fontSize: 12, color: T.text3, lineHeight: 1.7 }}>
                <div style={{ fontWeight: 700, color: T.text2, marginBottom: 6 }}>Setup instructions</div>
                <div>1. Go to dash.cloudflare.com → Workers & Pages → Create</div>
                <div>2. Name it <span style={{ fontFamily: "monospace", color: T.text1 }}>cargodesk-ai</span> and deploy</div>
                <div>3. Paste the worker code from the project files</div>
                <div>4. Settings → Variables → Add secret: <span style={{ fontFamily: "monospace", color: T.text1 }}>ANTHROPIC_API_KEY</span></div>
                <div>5. Copy the worker URL here and click Save</div>
              </div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* ── TRACKING ── */}
          {activeSection === "tracking" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Navigation size={18} color={T.accent} />
                <div style={{ fontSize: 14, color: T.text1 }}>
                  Configure the Cloudflare Worker URL for automated carrier tracking.
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 6 }}>
                  Tracking Worker URL
                </label>
                <input
                  type="url"
                  value={workerUrlInput}
                  onChange={e => setWorkerUrlInput(e.target.value)}
                  placeholder="https://cargodesk-tracker.your-subdomain.workers.dev"
                  style={inputStyle}
                />
                <div style={{ fontSize: 12, color: T.text3, marginTop: 4 }}>
                  The URL of your deployed Cloudflare Worker that proxies carrier tracking requests.
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <button onClick={handleSaveWorkerUrl}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "white", background: T.accent, border: "none", cursor: "pointer" }}>
                  <CheckCircle2 size={14} /> Save
                </button>
                <button onClick={handleTestWorker}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: T.text1, background: T.bg3, border: `1px solid ${T.border1}`, cursor: "pointer" }}>
                  <RefreshCw size={14} /> Test Connection
                </button>
              </div>

              {workerTestResult && (
                <div style={{ padding: 12, borderRadius: 8, display: "flex", alignItems: "center", gap: 8, marginBottom: 16, background: workerTestResult.ok === true ? T.greenBg : workerTestResult.ok === false ? T.redBg : T.bg3, border: `1px solid ${workerTestResult.ok === true ? T.greenBorder : workerTestResult.ok === false ? T.redBorder : T.border1}`, color: workerTestResult.ok === true ? T.green : workerTestResult.ok === false ? T.red : T.text2, fontSize: 13 }}>
                  {workerTestResult.ok === true && <CheckCircle2 size={15} />}
                  {workerTestResult.ok === false && <AlertTriangle size={15} />}
                  {workerTestResult.message}
                </div>
              )}

              <div style={{ padding: 14, borderRadius: 10, background: T.bg3, border: `1px solid ${T.border1}`, fontSize: 12, color: T.text3, lineHeight: 1.7 }}>
                <div style={{ fontWeight: 700, color: T.text2, marginBottom: 6 }}>Supported carriers</div>
                <div>Hapag-Lloyd, MSC, COSCO, CMA-CGM, ONE, OOCL</div>
                <div style={{ marginTop: 6 }}>Tracking polls every 4–6 hours and auto-updates shipment status and ETA.</div>
              </div>
            </div>
          )}

          {/* ── BACKUP ── */}
          {activeSection === "backup" && (
            <div>
              {/* Export */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Download size={16} color={T.accent} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: T.text0 }}>Export Backup</span>
                </div>
                <div style={{ fontSize: 13, color: T.text2, marginBottom: 12 }}>Download all your data as a JSON file. Add a password to encrypt it.</div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 6 }}>Password (optional)</label>
                  <input type="password" value={exportPassword} onChange={e => setExportPassword(e.target.value)} placeholder="Leave blank for unencrypted" style={inputStyle} />
                </div>
                <button onClick={handleExport} disabled={processing}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "white", background: T.accent, border: "none", cursor: processing ? "not-allowed" : "pointer", opacity: processing ? 0.6 : 1 }}>
                  <Download size={14} /> {processing ? "Exporting…" : "Download Backup"}
                </button>
              </div>

              {/* Import */}
              <div style={{ marginBottom: 28, paddingTop: 20, borderTop: `1px solid ${T.border1}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Upload size={16} color={T.green} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: T.text0 }}>Restore Backup</span>
                </div>
                <div style={{ fontSize: 13, color: T.text2, marginBottom: 12 }}>Paste your backup JSON below. This will replace all current data.</div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 6 }}>Backup Data</label>
                  <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="Paste backup JSON or encrypted backup here…" rows={4}
                    style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace", fontSize: 12 }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 6 }}>Password (if encrypted)</label>
                  <input type="password" value={importPassword} onChange={e => setImportPassword(e.target.value)} placeholder="Leave blank if unencrypted" style={inputStyle} />
                </div>
                <button onClick={handleImport} disabled={processing || !importText.trim()}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "white", background: T.green, border: "none", cursor: processing || !importText.trim() ? "not-allowed" : "pointer", opacity: processing || !importText.trim() ? 0.6 : 1 }}>
                  <Upload size={14} /> {processing ? "Restoring…" : "Restore Backup"}
                </button>
              </div>

              {/* Reset */}
              <div style={{ paddingTop: 20, borderTop: `1px solid ${T.border1}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Trash2 size={16} color={T.red} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: T.text0 }}>Reset Database</span>
                </div>
                <div style={{ fontSize: 13, color: T.text2, marginBottom: 12 }}>
                  {getMode() === "test" ? "Reset test database to seed data. Production data is unaffected." : "Permanently delete all production data. This cannot be undone."}
                </div>
                {!confirmReset ? (
                  <button onClick={() => setConfirmReset(true)}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: T.red, background: T.redBg, border: `1px solid ${T.redBorder}`, cursor: "pointer" }}>
                    <Trash2 size={14} /> Reset Database
                  </button>
                ) : (
                  <div style={{ padding: 16, borderRadius: 10, background: T.redBg, border: `1px solid ${T.redBorder}` }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.red, marginBottom: 12 }}>
                      <AlertTriangle size={14} style={{ display: "inline", marginRight: 6 }} />
                      Are you sure? This cannot be undone.
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setConfirmReset(false)}
                        style={{ padding: "8px 16px", borderRadius: 6, fontSize: 13, color: T.text2, background: T.bg3, border: `1px solid ${T.border1}`, cursor: "pointer" }}>
                        Cancel
                      </button>
                      <button onClick={handleReset} disabled={processing}
                        style={{ padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, color: "white", background: T.red, border: "none", cursor: "pointer" }}>
                        {processing ? "Resetting…" : "Yes, Reset Everything"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
