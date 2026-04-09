import { ArrowRight, FileText, DollarSign, CheckCircle2, Ship, FolderOpen, MessageSquare, Circle } from "lucide-react";
import { timeAgo } from "../utils/activityLog.js";

const ICONS = {
  status: ArrowRight, document: FileText, cost: DollarSign,
  milestone: CheckCircle2, shipment: Ship, project: FolderOpen,
  note: MessageSquare,
};

export default function ActivityFeed({ T, activities, onClickActivity }) {
  if (!activities || !activities.length) {
    return <div style={{ padding: 16, textAlign: "center", fontSize: 13, color: T.text3 }}>No recent activity</div>;
  }

  return (
    <div>
      {activities.slice(0, 20).map((a, i) => {
        const Icon = ICONS[a.type] || Circle;
        const colors = {
          status: T.accent, document: T.purple, cost: T.amber,
          milestone: T.green, shipment: T.accent, project: T.accent, note: T.text2,
        };
        const iconColor = colors[a.type] || T.text3;

        return (
          <div key={a.id} onClick={() => onClickActivity && a.shipmentId && onClickActivity(a.shipmentId)}
            style={{
              display: "flex", gap: 10, padding: "10px 12px", cursor: a.shipmentId ? "pointer" : "default",
              borderBottom: i < Math.min(activities.length, 20) - 1 ? `1px solid ${T.border0}` : "none",
              transition: "background 0.1s",
            }}
            onMouseEnter={e => { if (a.shipmentId) e.currentTarget.style.background = T.bg4; }}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: T.bg4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
              <Icon size={12} color={iconColor} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: T.text1, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                {a.message}
              </div>
              <div style={{ fontSize: 10, color: T.text3, marginTop: 2 }}>{timeAgo(a.timestamp)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
