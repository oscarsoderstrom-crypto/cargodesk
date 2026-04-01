import { useState } from "react";
import { Download, Upload, Trash2, AlertTriangle, CheckCircle2, Shield, X, RefreshCw } from "lucide-react";
import { exportData, importData, resetDB, getMode, setMode } from "../db/schema.js";

export default function SettingsPanel({ T, onClose, onModeChange, onDataChange }) {
  const [activeSection, setActiveSection] = useState("mode");
  const [exportPassword, setExportPassword] = useState("");
  const [importPassword, setImportPassword] = useState("");
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [processing, setProcessing] = useState(false);

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
      const blob = new Blob([result], { type: exportPassword ? 'text/plain' : 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cargodesk_backup_${currentMode}_${new Date().toISOString().split('T')[0]}${exportPassword ? '.enc' : '.json'}`;
      a.click();
      URL.revokeObjectURL(url);
      showMessage('success', `Backup exported${exportPassword ? ' (encrypted)' : ''}.`);
      setExportPassword("");
    } catch (err) {
      showMessage('error', `Export failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!importText.trim()) return;
    setProcessing(true);
    try {
      const result = await importData(importText.trim(), importPassword || null);
      showMessage('success', `Imported ${result.projects} projects, ${result.shipments} shipments, ${result.documents} documents.`);
      setImportText("");
      setImportPassword("");
      if (onDataChange) onDataChange();
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    setImportText(text);
    e.target.value = '';
  };

  const handleReset = async () => {
    setProcessing(true);
    try {
      await resetDB();
      setConfirmReset(false);
      showMessage('success', `Database reset.${currentMode === 'test' ? ' Sample data restored.' : ''}`);
      if (onDataChange) onDataChange();
    } catch (err) {
      showMessage('error', `Reset failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const sections = [
    { id: "mode", label: "Mode" },
    { id: "backup", label: "Backup" },
    { id: "restore", label: "Restore" },
    { id: "danger", label: "Reset" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", width: 560, maxHeight: "85vh", overflow: "auto", background: T.bg2, borderRadius: 16, border: `1px solid ${T.border1}`, boxShadow: `0 24px 80px ${T.shadowHeavy}` }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: `1px solid ${T.border1}`, position: "sticky", top: 0, background: T.bg2, zIndex: 1, borderRadius: "16px 16px 0 0" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text0 }}>Settings</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.text2, padding: 4 }}><X size={20} /></button>
        </div>

        {/* Tab navigation */}
        <div style={{ display: "flex", gap: 4, padding: "12px 24px", borderBottom: `1px solid ${T.border0}` }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              style={{
                padding: "6px 14px", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer",
                background: activeSection === s.id ? T.bg4 : "transparent",
                color: activeSection === s.id ? T.text0 : T.text3,
                border: "none",
              }}>{s.label}</button>
          ))}
        </div>

        {/* Message */}
        {message && (
          <div style={{ margin: "12px 24px 0", padding: 12, borderRadius: 8, display: "flex", alignItems: "center", gap: 8,
            background: message.type === 'success' ? T.greenBg : T.redBg,
            border: `1px solid ${message.type === 'success' ? T.greenBorder : T.redBorder}`,
            color: message.type === 'success' ? T.green : T.red, fontSize: 13, fontWeight: 500 }}>
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {message.text}
          </div>
        )}

        <div style={{ padding: 24 }}>

          {/* MODE SECTION */}
          {activeSection === "mode" && (
            <div>
              <div style={{ fontSize: 14, color: T.text1, marginBottom: 16 }}>
                Switch between test and production databases. Each mode has its own completely separate data.
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* Test Mode Card */}
                <button onClick={() => handleModeSwitch('test')}
                  style={{
                    padding: 20, borderRadius: 12, textAlign: "left", cursor: "pointer",
                    background: currentMode === 'test' ? T.amberBg : T.bg3,
                    border: `2px solid ${currentMode === 'test' ? T.amber : T.border1}`,
                    transition: "all 0.15s",
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: T.amber }} />
                    <span style={{ fontSize: 16, fontWeight: 700, color: currentMode === 'test' ? T.amber : T.text0 }}>Test Mode</span>
                  </div>
                  <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.5 }}>
                    Pre-loaded sample data. Safe to experiment — your real data is untouched.
                  </div>
                  {currentMode === 'test' && (
                    <div style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: T.amber }}>
                      ✓ Currently active
                    </div>
                  )}
                </button>

                {/* Production Mode Card */}
                <button onClick={() => handleModeSwitch('production')}
                  style={{
                    padding: 20, borderRadius: 12, textAlign: "left", cursor: "pointer",
                    background: currentMode === 'production' ? T.greenBg : T.bg3,
                    border: `2px solid ${currentMode === 'production' ? T.green : T.border1}`,
                    transition: "all 0.15s",
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: T.green }} />
                    <span style={{ fontSize: 16, fontWeight: 700, color: currentMode === 'production' ? T.green : T.text0 }}>Production</span>
                  </div>
                  <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.5 }}>
                    Your real data. Starts empty — create your actual projects and shipments here.
                  </div>
                  {currentMode === 'production' && (
                    <div style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: T.green }}>
                      ✓ Currently active
                    </div>
                  )}
                </button>
              </div>

              <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: T.bg3, border: `1px solid ${T.border0}`, fontSize: 12, color: T.text3, lineHeight: 1.5 }}>
                <strong style={{ color: T.text2 }}>How it works:</strong> Each mode uses a separate database. Switching modes instantly loads the other database. No data is shared or lost when switching.
              </div>
            </div>
          )}

          {/* BACKUP SECTION */}
          {activeSection === "backup" && (
            <div>
              <div style={{ fontSize: 14, color: T.text1, marginBottom: 16 }}>
                Export your {currentMode} data as a backup file. Optionally encrypt it with a password.
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 6 }}>
                  <Shield size={12} style={{ display: "inline", marginRight: 4 }} />
                  Encryption Password (optional)
                </label>
                <input type="password" value={exportPassword} onChange={e => setExportPassword(e.target.value)}
                  placeholder="Leave empty for unencrypted backup" style={inputStyle} />
              </div>

              <button onClick={handleExport} disabled={processing}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", borderRadius: 8,
                  fontSize: 14, fontWeight: 600, color: "white", background: T.accent,
                  border: "none", cursor: processing ? "wait" : "pointer", width: "100%", justifyContent: "center",
                }}>
                {processing ? <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Download size={16} />}
                {processing ? "Exporting..." : "Download Backup"}
              </button>
              <style>{`@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}`}</style>
            </div>
          )}

          {/* RESTORE SECTION */}
          {activeSection === "restore" && (
            <div>
              <div style={{ fontSize: 14, color: T.text1, marginBottom: 4 }}>
                Import data from a backup file. This replaces all current {currentMode} data.
              </div>
              <div style={{ fontSize: 12, color: T.red, marginBottom: 16 }}>
                ⚠ Current data in {currentMode} mode will be overwritten.
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 6 }}>Backup File</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => document.getElementById('import-file')?.click()}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: T.text1, background: T.bg3, border: `1px solid ${T.border1}`, cursor: "pointer" }}>
                    <Upload size={14} /> Choose File
                  </button>
                  <input id="import-file" type="file" accept=".json,.enc" onChange={handleFileImport} style={{ display: "none" }} />
                  {importText && <span style={{ fontSize: 13, color: T.green, display: "flex", alignItems: "center", gap: 4 }}>
                    <CheckCircle2 size={14} /> File loaded ({(importText.length / 1024).toFixed(1)} KB)
                  </span>}
                </div>
              </div>

              {importText && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 6 }}>
                      Password (if encrypted)
                    </label>
                    <input type="password" value={importPassword} onChange={e => setImportPassword(e.target.value)}
                      placeholder="Leave empty if not encrypted" style={inputStyle} />
                  </div>

                  <button onClick={handleImport} disabled={processing}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", borderRadius: 8,
                      fontSize: 14, fontWeight: 600, color: "white", background: T.amber,
                      border: "none", cursor: processing ? "wait" : "pointer", width: "100%", justifyContent: "center",
                    }}>
                    {processing ? <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Upload size={16} />}
                    {processing ? "Importing..." : "Restore Backup"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* DANGER ZONE */}
          {activeSection === "danger" && (
            <div>
              <div style={{ fontSize: 14, color: T.text1, marginBottom: 16 }}>
                Reset the {currentMode} database.{currentMode === 'test' ? ' This will restore the sample data.' : ' This will delete all your data.'}
              </div>

              {!confirmReset ? (
                <button onClick={() => setConfirmReset(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", borderRadius: 8,
                    fontSize: 14, fontWeight: 600, color: T.red, background: T.redBg,
                    border: `1px solid ${T.redBorder}`, cursor: "pointer",
                  }}>
                  <Trash2 size={16} /> Reset {currentMode === 'test' ? 'Test' : 'Production'} Database
                </button>
              ) : (
                <div style={{ padding: 16, borderRadius: 10, background: T.redBg, border: `1px solid ${T.redBorder}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color: T.red, fontWeight: 600, fontSize: 14 }}>
                    <AlertTriangle size={18} />
                    Are you sure? This cannot be undone.
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setConfirmReset(false)}
                      style={{ padding: "8px 16px", borderRadius: 6, fontSize: 13, color: T.text2, background: T.bg3, border: `1px solid ${T.border1}`, cursor: "pointer" }}>
                      Cancel
                    </button>
                    <button onClick={handleReset} disabled={processing}
                      style={{ padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, color: "white", background: T.red, border: "none", cursor: "pointer" }}>
                      {processing ? "Resetting..." : "Yes, Reset Everything"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
