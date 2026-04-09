/**
 * Activity log system.
 * Records changes to shipments, projects, and documents.
 * Stored in IndexedDB via the main schema.
 */

export function createActivity(type, message, shipmentId = null, meta = {}) {
  return {
    id: crypto.randomUUID(),
    type,        // "status", "document", "cost", "milestone", "shipment", "project"
    message,
    shipmentId,
    timestamp: new Date().toISOString(),
    ...meta,
  };
}

/**
 * Format a timestamp as relative time: "2h ago", "3d ago", "Mar 28"
 */
export function timeAgo(timestamp) {
  if (!timestamp) return "";
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString("fi-FI", { day: "numeric", month: "short" });
}

/**
 * Get icon type for activity
 */
export function activityIcon(type) {
  const map = {
    status: "arrow",
    document: "file",
    cost: "dollar",
    milestone: "check",
    shipment: "ship",
    project: "folder",
    note: "message",
  };
  return map[type] || "circle";
}
