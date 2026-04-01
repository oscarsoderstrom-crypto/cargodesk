/**
 * Container types for logistics.
 */

export const CONTAINER_TYPES = [
  { id: "20GP", label: "20' GP", desc: "20ft General Purpose", teu: 1 },
  { id: "20HC", label: "20' HC", desc: "20ft High Cube", teu: 1 },
  { id: "40GP", label: "40' GP", desc: "40ft General Purpose", teu: 2 },
  { id: "40HC", label: "40' HC", desc: "40ft High Cube", teu: 2 },
  { id: "45HC", label: "45' HC", desc: "45ft High Cube", teu: 2.25 },
  { id: "20OT", label: "20' OT", desc: "20ft Open Top", teu: 1 },
  { id: "40OT", label: "40' OT", desc: "40ft Open Top", teu: 2 },
  { id: "20FR", label: "20' FR", desc: "20ft Flat Rack", teu: 1 },
  { id: "40FR", label: "40' FR", desc: "40ft Flat Rack", teu: 2 },
  { id: "20RF", label: "20' RF", desc: "20ft Reefer", teu: 1 },
  { id: "40RF", label: "40' RF", desc: "40ft Reefer", teu: 2 },
  { id: "20TK", label: "20' Tank", desc: "20ft ISO Tank", teu: 1 },
  { id: "BB",   label: "Break Bulk", desc: "Conventional cargo", teu: 0 },
  { id: "RR",   label: "RoRo", desc: "Roll-on/Roll-off", teu: 0 },
  { id: "LCL",  label: "LCL", desc: "Less than Container Load", teu: 0 },
  { id: "FTL",  label: "Full Truck Load", desc: "Road transport", teu: 0 },
  { id: "LTL",  label: "Less than Truck Load", desc: "Road transport", teu: 0 },
  { id: "AIR",  label: "Air Cargo", desc: "Air freight unit", teu: 0 },
  { id: "PALLET", label: "Pallet", desc: "Air/road pallet", teu: 0 },
];

/**
 * Get container type by ID.
 */
export function getContainerType(id) {
  return CONTAINER_TYPES.find(c => c.id === id) || null;
}

/**
 * Format container selection for display: "2 x 40'HC"
 */
export function formatContainer(typeId, count) {
  const type = getContainerType(typeId);
  if (!type) return `${count} units`;
  return `${count} x ${type.label}`;
}

/**
 * Get container types filtered by transport mode.
 */
export function getContainerTypesForMode(mode) {
  if (mode === "ocean") {
    return CONTAINER_TYPES.filter(c => !["FTL", "LTL", "AIR", "PALLET"].includes(c.id));
  }
  if (mode === "air") {
    return CONTAINER_TYPES.filter(c => ["AIR", "PALLET", "LCL"].includes(c.id));
  }
  if (mode === "truck") {
    return CONTAINER_TYPES.filter(c => ["FTL", "LTL", "20GP", "20HC", "40GP", "40HC", "40FR", "20FR", "20OT", "40OT"].includes(c.id));
  }
  return CONTAINER_TYPES;
}
