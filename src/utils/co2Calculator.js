/**
 * CO2e emissions calculator for freight logistics.
 *
 * Based on GLEC Framework / IMO guidelines.
 * Emission factors in grams CO2e per TEU-km (ocean) or per tonne-km (air/truck).
 */

// Emission factors (g CO2e per unit)
const FACTORS = {
  // Ocean: grams CO2e per TEU per km
  // Average container vessel ~10-20g CO2e per TEU-km
  ocean: {
    default: 16,      // Average
    small_vessel: 25,  // <4000 TEU
    medium_vessel: 16, // 4000-12000 TEU
    large_vessel: 10,  // >12000 TEU (ULCV)
  },
  // Air: grams CO2e per tonne per km
  air: {
    default: 602,      // Average air cargo
    belly_cargo: 500,  // Passenger aircraft belly
    freighter: 650,    // Dedicated freighter
  },
  // Truck: grams CO2e per tonne per km
  truck: {
    default: 62,       // Average truck
    ftl: 55,           // Full truck load
    ltl: 80,           // Less than truck load
  },
  // Rail: grams CO2e per tonne per km
  rail: {
    default: 22,       // Average freight rail
    electric: 8,       // Electric rail
    diesel: 28,        // Diesel rail
  },
};

// Container weight assumptions (tonnes)
const CONTAINER_WEIGHTS = {
  "20'GP": { tare: 2.3, maxPayload: 21.7, avgPayload: 14 },
  "20'HC": { tare: 2.5, maxPayload: 21.5, avgPayload: 14 },
  "40'GP": { tare: 3.8, maxPayload: 26.7, avgPayload: 20 },
  "40'HC": { tare: 4.0, maxPayload: 26.5, avgPayload: 22 },
  "45'HC": { tare: 4.8, maxPayload: 25.6, avgPayload: 22 },
  "20'OT": { tare: 2.4, maxPayload: 21.6, avgPayload: 16 },
  "40'OT": { tare: 4.0, maxPayload: 26.5, avgPayload: 20 },
  "20'FR": { tare: 2.8, maxPayload: 21.2, avgPayload: 18 },
  "40'FR": { tare: 5.0, maxPayload: 25.5, avgPayload: 22 },
  "20'RF": { tare: 3.0, maxPayload: 21.0, avgPayload: 16 },
  "40'RF": { tare: 4.5, maxPayload: 26.0, avgPayload: 20 },
};

// TEU conversion
const TEU_MAP = {
  "20'GP": 1, "20'HC": 1, "20'OT": 1, "20'FR": 1, "20'RF": 1,
  "40'GP": 2, "40'HC": 2, "40'OT": 2, "40'FR": 2, "40'RF": 2,
  "45'HC": 2.25,
};

/**
 * Calculate CO2e for a shipment leg.
 *
 * @param {object} params
 * @param {string} params.mode - "ocean", "air", "truck", "rail"
 * @param {number} params.distanceKm - Distance in km
 * @param {string} [params.containerType] - e.g. "40'HC"
 * @param {number} [params.containerCount] - Number of containers
 * @param {number} [params.weightTonnes] - Cargo weight in tonnes (for air/truck)
 * @param {string} [params.subType] - e.g. "large_vessel", "ftl", "freighter"
 * @returns {object} { co2eKg, co2eTonnes, details }
 */
export function calculateCO2e({
  mode = "ocean",
  distanceKm = 0,
  containerType = "40'HC",
  containerCount = 1,
  weightTonnes = null,
  subType = "default",
}) {
  if (distanceKm <= 0) return { co2eKg: 0, co2eTonnes: 0, details: "No distance" };

  const factor = FACTORS[mode]?.[subType] || FACTORS[mode]?.default || FACTORS.ocean.default;
  let co2eGrams = 0;
  let details = "";

  if (mode === "ocean") {
    const teu = (TEU_MAP[containerType] || 2) * containerCount;
    co2eGrams = factor * teu * distanceKm;
    details = `${teu} TEU × ${distanceKm.toLocaleString()} km × ${factor} g/TEU-km`;
  } else if (mode === "air") {
    const weight = weightTonnes || (containerCount * 5); // Default 5t per air shipment unit
    co2eGrams = factor * weight * distanceKm;
    details = `${weight}t × ${distanceKm.toLocaleString()} km × ${factor} g/t-km`;
  } else if (mode === "truck") {
    const weight = weightTonnes || (CONTAINER_WEIGHTS[containerType]?.avgPayload || 20) * containerCount;
    co2eGrams = factor * weight * distanceKm;
    details = `${weight}t × ${distanceKm.toLocaleString()} km × ${factor} g/t-km`;
  } else if (mode === "rail") {
    const weight = weightTonnes || (CONTAINER_WEIGHTS[containerType]?.avgPayload || 20) * containerCount;
    co2eGrams = factor * weight * distanceKm;
    details = `${weight}t × ${distanceKm.toLocaleString()} km × ${factor} g/t-km`;
  }

  const co2eKg = co2eGrams / 1000;
  const co2eTonnes = co2eKg / 1000;

  return {
    co2eKg: Math.round(co2eKg),
    co2eTonnes: parseFloat(co2eTonnes.toFixed(3)),
    details,
    factor,
    mode,
    distanceKm: Math.round(distanceKm),
  };
}

/**
 * Calculate CO2e for a multi-leg route.
 *
 * @param {Array} legs - Array of { mode, distanceKm, containerType, containerCount }
 * @returns {object} { totalCO2eKg, totalCO2eTonnes, legs }
 */
export function calculateRouteCO2e(legs) {
  const results = legs.map(leg => calculateCO2e(leg));
  const totalKg = results.reduce((s, r) => s + r.co2eKg, 0);
  return {
    totalCO2eKg: totalKg,
    totalCO2eTonnes: parseFloat((totalKg / 1000).toFixed(3)),
    legs: results,
  };
}

/**
 * Format CO2e for display.
 */
export function formatCO2e(kg) {
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t CO₂e`;
  return `${Math.round(kg)} kg CO₂e`;
}

export { CONTAINER_WEIGHTS, TEU_MAP, FACTORS };
