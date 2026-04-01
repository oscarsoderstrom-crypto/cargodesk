/**
 * Carrier database for logistics.
 * Organized by transport mode with major global carriers first,
 * then regional and local carriers.
 */

export const CARRIERS = [
  // === OCEAN — Major Global ===
  { name:"Hapag-Lloyd",country:"DE",mode:"ocean",tier:"major",alliance:"THE Alliance" },
  { name:"MSC",country:"CH",mode:"ocean",tier:"major",alliance:"None (2M ended)" },
  { name:"Maersk",country:"DK",mode:"ocean",tier:"major",alliance:"Gemini" },
  { name:"CMA CGM",country:"FR",mode:"ocean",tier:"major",alliance:"Ocean Alliance" },
  { name:"COSCO Shipping",country:"CN",mode:"ocean",tier:"major",alliance:"Ocean Alliance" },
  { name:"Evergreen",country:"TW",mode:"ocean",tier:"major",alliance:"Ocean Alliance" },
  { name:"ONE (Ocean Network Express)",country:"JP",mode:"ocean",tier:"major",alliance:"THE Alliance" },
  { name:"OOCL",country:"HK",mode:"ocean",tier:"major",alliance:"Ocean Alliance" },
  { name:"Yang Ming",country:"TW",mode:"ocean",tier:"major",alliance:"THE Alliance" },
  { name:"HMM",country:"KR",mode:"ocean",tier:"major",alliance:"THE Alliance" },
  { name:"ZIM",country:"IL",mode:"ocean",tier:"major",alliance:"None" },
  { name:"PIL (Pacific International Lines)",country:"SG",mode:"ocean",tier:"major",alliance:"None" },
  { name:"Wan Hai Lines",country:"TW",mode:"ocean",tier:"regional",alliance:"None" },
  // === OCEAN — RoRo / Break Bulk / Project Cargo ===
  { name:"Wallenius Wilhelmsen",country:"NO",mode:"ocean",tier:"major",alliance:"None" },
  { name:"Höegh Autoliners",country:"NO",mode:"ocean",tier:"major",alliance:"None" },
  { name:"NYK RORO",country:"JP",mode:"ocean",tier:"regional",alliance:"None" },
  { name:"BBC Chartering",country:"DE",mode:"ocean",tier:"regional",alliance:"None" },
  { name:"SAL Heavy Lift",country:"DE",mode:"ocean",tier:"regional",alliance:"None" },
  { name:"AAL Shipping",country:"SG",mode:"ocean",tier:"regional",alliance:"None" },
  { name:"Chipolbrok",country:"CN",mode:"ocean",tier:"regional",alliance:"None" },
  // === OCEAN — Nordic / Baltic / Regional ===
  { name:"Nordicon",country:"FI",mode:"ocean",tier:"local",alliance:"None" },
  { name:"Containerships (CMA CGM)",country:"FI",mode:"ocean",tier:"local",alliance:"None" },
  { name:"UECC",country:"NO",mode:"ocean",tier:"local",alliance:"None" },
  { name:"Unifeeder",country:"DK",mode:"ocean",tier:"local",alliance:"None" },
  { name:"Samskip",country:"IS",mode:"ocean",tier:"local",alliance:"None" },
  { name:"Eimskip",country:"IS",mode:"ocean",tier:"local",alliance:"None" },
  { name:"Team Lines",country:"DE",mode:"ocean",tier:"local",alliance:"None" },
  { name:"Mann Lines",country:"FI",mode:"ocean",tier:"local",alliance:"None" },
  { name:"Finnlines",country:"FI",mode:"ocean",tier:"local",alliance:"None" },
  { name:"Viking Line Cargo",country:"FI",mode:"ocean",tier:"local",alliance:"None" },
  { name:"Tallink Cargo",country:"EE",mode:"ocean",tier:"local",alliance:"None" },
  { name:"DFDS",country:"DK",mode:"ocean",tier:"local",alliance:"None" },
  { name:"Stena Line Freight",country:"SE",mode:"ocean",tier:"local",alliance:"None" },
  { name:"Transfennica",country:"FI",mode:"ocean",tier:"local",alliance:"None" },
  { name:"Bore",country:"FI",mode:"ocean",tier:"local",alliance:"None" },
  { name:"Godby Shipping",country:"FI",mode:"ocean",tier:"local",alliance:"None" },
  { name:"ESL Shipping",country:"FI",mode:"ocean",tier:"local",alliance:"None" },
  // === OCEAN — Mediterranean / Middle East ===
  { name:"Arkas Line",country:"TR",mode:"ocean",tier:"regional",alliance:"None" },
  { name:"Turkon Line",country:"TR",mode:"ocean",tier:"regional",alliance:"None" },
  { name:"IRISL",country:"IR",mode:"ocean",tier:"regional",alliance:"None" },
  { name:"UASC (merged into Hapag-Lloyd)",country:"KW",mode:"ocean",tier:"regional",alliance:"None" },
  // === OCEAN — Americas ===
  { name:"Crowley",country:"US",mode:"ocean",tier:"regional",alliance:"None" },
  { name:"TOTE Maritime",country:"US",mode:"ocean",tier:"regional",alliance:"None" },
  { name:"Tropical Shipping",country:"US",mode:"ocean",tier:"regional",alliance:"None" },
  { name:"Seaboard Marine",country:"US",mode:"ocean",tier:"regional",alliance:"None" },
  // === AIR — Major Global ===
  { name:"Finnair Cargo",country:"FI",mode:"air",tier:"major",alliance:"Oneworld" },
  { name:"Lufthansa Cargo",country:"DE",mode:"air",tier:"major",alliance:"Star Alliance" },
  { name:"Emirates SkyCargo",country:"AE",mode:"air",tier:"major",alliance:"None" },
  { name:"Turkish Cargo",country:"TR",mode:"air",tier:"major",alliance:"Star Alliance" },
  { name:"Qatar Airways Cargo",country:"QA",mode:"air",tier:"major",alliance:"Oneworld" },
  { name:"Cargolux",country:"LU",mode:"air",tier:"major",alliance:"None" },
  { name:"DHL Aviation",country:"DE",mode:"air",tier:"major",alliance:"None" },
  { name:"FedEx",country:"US",mode:"air",tier:"major",alliance:"None" },
  { name:"UPS Airlines",country:"US",mode:"air",tier:"major",alliance:"None" },
  { name:"Cathay Cargo",country:"HK",mode:"air",tier:"major",alliance:"Oneworld" },
  { name:"Singapore Airlines Cargo",country:"SG",mode:"air",tier:"major",alliance:"Star Alliance" },
  { name:"Korean Air Cargo",country:"KR",mode:"air",tier:"major",alliance:"SkyTeam" },
  { name:"ANA Cargo",country:"JP",mode:"air",tier:"major",alliance:"Star Alliance" },
  { name:"Air France-KLM Cargo",country:"FR",mode:"air",tier:"major",alliance:"SkyTeam" },
  { name:"British Airways World Cargo",country:"GB",mode:"air",tier:"major",alliance:"Oneworld" },
  { name:"Ethiopian Cargo",country:"ET",mode:"air",tier:"major",alliance:"Star Alliance" },
  // === AIR — Regional / Nordic ===
  { name:"SAS Cargo",country:"SE",mode:"air",tier:"regional",alliance:"SkyTeam" },
  { name:"Icelandair Cargo",country:"IS",mode:"air",tier:"regional",alliance:"None" },
  { name:"Norwegian Cargo",country:"NO",mode:"air",tier:"regional",alliance:"None" },
  // === TRUCK — Major European ===
  { name:"DSV Road",country:"DK",mode:"truck",tier:"major",alliance:"None" },
  { name:"DB Schenker",country:"DE",mode:"truck",tier:"major",alliance:"None" },
  { name:"DHL Freight",country:"DE",mode:"truck",tier:"major",alliance:"None" },
  { name:"Kuehne+Nagel Road",country:"CH",mode:"truck",tier:"major",alliance:"None" },
  { name:"GEODIS",country:"FR",mode:"truck",tier:"major",alliance:"None" },
  { name:"XPO Logistics",country:"US",mode:"truck",tier:"major",alliance:"None" },
  { name:"Dachser",country:"DE",mode:"truck",tier:"major",alliance:"None" },
  { name:"CEVA Logistics",country:"CH",mode:"truck",tier:"major",alliance:"None" },
  { name:"Bolloré Logistics",country:"FR",mode:"truck",tier:"major",alliance:"None" },
  { name:"Hellmann Worldwide",country:"DE",mode:"truck",tier:"major",alliance:"None" },
  // === TRUCK — Nordic / Finland ===
  { name:"Posti Freight",country:"FI",mode:"truck",tier:"local",alliance:"None" },
  { name:"Schenker Oy",country:"FI",mode:"truck",tier:"local",alliance:"None" },
  { name:"Ahola Transport",country:"FI",mode:"truck",tier:"local",alliance:"None" },
  { name:"Kaukokiito",country:"FI",mode:"truck",tier:"local",alliance:"None" },
  { name:"Kiitosimeon",country:"FI",mode:"truck",tier:"local",alliance:"None" },
  { name:"Nurminen Logistics",country:"FI",mode:"truck",tier:"local",alliance:"None" },
  { name:"Beweship",country:"FI",mode:"truck",tier:"local",alliance:"None" },
  { name:"Greencarrier",country:"SE",mode:"truck",tier:"local",alliance:"None" },
  { name:"Bring",country:"NO",mode:"truck",tier:"local",alliance:"None" },
  { name:"PostNord Logistics",country:"SE",mode:"truck",tier:"local",alliance:"None" },
  { name:"NTEX",country:"SE",mode:"truck",tier:"local",alliance:"None" },
  // === NVOCC / Freight Forwarders (multi-mode) ===
  { name:"Flexport",country:"US",mode:"ocean",tier:"regional",alliance:"None" },
  { name:"Expeditors",country:"US",mode:"ocean",tier:"regional",alliance:"None" },
  { name:"Agility Logistics",country:"KW",mode:"ocean",tier:"regional",alliance:"None" },
  { name:"Nippon Express",country:"JP",mode:"ocean",tier:"regional",alliance:"None" },
  { name:"Kintetsu World Express",country:"JP",mode:"air",tier:"regional",alliance:"None" },
  { name:"Panalpina (DSV)",country:"CH",mode:"ocean",tier:"regional",alliance:"None" },
];

/**
 * Search carriers by query string, filtered by mode.
 */
export function searchCarriers(query, mode = null, limit = 10) {
  if (!query || query.length < 1) {
    // Return top carriers for the mode
    let filtered = mode ? CARRIERS.filter(c => c.mode === mode) : CARRIERS;
    filtered.sort((a, b) => {
      const tierOrder = { major: 0, regional: 1, local: 2 };
      return (tierOrder[a.tier] || 3) - (tierOrder[b.tier] || 3);
    });
    return filtered.slice(0, limit);
  }

  const q = query.toLowerCase().trim();
  let filtered = CARRIERS.filter(c => {
    if (mode && c.mode !== mode) return false;
    return c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q);
  });

  // Sort: tier first, then starts-with, then alphabetical
  filtered.sort((a, b) => {
    const tierOrder = { major: 0, regional: 1, local: 2 };
    const tierDiff = (tierOrder[a.tier] || 3) - (tierOrder[b.tier] || 3);
    if (tierDiff !== 0) return tierDiff;
    const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
    const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return a.name.localeCompare(b.name);
  });

  return filtered.slice(0, limit);
}

export function findCarrier(name) {
  if (!name) return null;
  const q = name.toLowerCase().trim();
  return CARRIERS.find(c => c.name.toLowerCase() === q) || null;
}
