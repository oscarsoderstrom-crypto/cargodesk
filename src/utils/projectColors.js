/**
 * Project color system.
 * Auto-assigns distinct colors to projects for visual identification.
 */

const PROJECT_COLORS = [
  { id: "blue", color: "#3B82F6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.25)" },
  { id: "emerald", color: "#10B981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.25)" },
  { id: "amber", color: "#F59E0B", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)" },
  { id: "rose", color: "#F43F5E", bg: "rgba(244,63,94,0.12)", border: "rgba(244,63,94,0.25)" },
  { id: "violet", color: "#8B5CF6", bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.25)" },
  { id: "cyan", color: "#06B6D4", bg: "rgba(6,182,212,0.12)", border: "rgba(6,182,212,0.25)" },
  { id: "orange", color: "#F97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.25)" },
  { id: "pink", color: "#EC4899", bg: "rgba(236,72,153,0.12)", border: "rgba(236,72,153,0.25)" },
  { id: "lime", color: "#84CC16", bg: "rgba(132,204,22,0.12)", border: "rgba(132,204,22,0.25)" },
  { id: "teal", color: "#14B8A6", bg: "rgba(20,184,166,0.12)", border: "rgba(20,184,166,0.25)" },
  { id: "indigo", color: "#6366F1", bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.25)" },
  { id: "yellow", color: "#EAB308", bg: "rgba(234,179,8,0.12)", border: "rgba(234,179,8,0.25)" },
];

/**
 * Get a color for a project by index or assigned color ID.
 */
export function getProjectColor(project, index = 0) {
  if (project?.colorId) {
    const found = PROJECT_COLORS.find(c => c.id === project.colorId);
    if (found) return found;
  }
  return PROJECT_COLORS[index % PROJECT_COLORS.length];
}

/**
 * Get all available colors for manual selection.
 */
export function getAllProjectColors() {
  return PROJECT_COLORS;
}

export { PROJECT_COLORS };
