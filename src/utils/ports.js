/**
 * Port and city database for logistics.
 * Covers major container ports, airports, and inland logistics hubs.
 * Format: { name, country, code, type, lat, lng }
 */

export const PORTS = [
  // Finland
  { name:"Helsinki",country:"FI",code:"FIHEL",type:"sea",lat:60.15,lng:24.94 },
  { name:"Kotka",country:"FI",code:"FIKTK",type:"sea",lat:60.47,lng:26.94 },
  { name:"Hamina",country:"FI",code:"FIHMN",type:"sea",lat:60.57,lng:27.18 },
  { name:"Turku",country:"FI",code:"FITKU",type:"sea",lat:60.45,lng:22.25 },
  { name:"Rauma",country:"FI",code:"FIRAU",type:"sea",lat:61.13,lng:21.50 },
  { name:"Hanko",country:"FI",code:"FIHKO",type:"sea",lat:59.82,lng:22.97 },
  { name:"Oulu",country:"FI",code:"FIOUL",type:"sea",lat:65.01,lng:25.47 },
  { name:"Helsinki-Vantaa",country:"FI",code:"FIHEL",type:"air",lat:60.32,lng:24.97 },
  // Sweden
  { name:"Stockholm",country:"SE",code:"SESTO",type:"sea",lat:59.33,lng:18.07 },
  { name:"Gothenburg",country:"SE",code:"SEGOT",type:"sea",lat:57.71,lng:11.97 },
  { name:"Helsingborg",country:"SE",code:"SEHEL",type:"sea",lat:56.05,lng:12.69 },
  { name:"Malmö",country:"SE",code:"SEMMA",type:"sea",lat:55.61,lng:13.00 },
  { name:"Norrköping",country:"SE",code:"SENRK",type:"sea",lat:58.59,lng:16.18 },
  // Norway
  { name:"Oslo",country:"NO",code:"NOOSL",type:"sea",lat:59.91,lng:10.75 },
  { name:"Bergen",country:"NO",code:"NOBGN",type:"sea",lat:60.39,lng:5.32 },
  { name:"Stavanger",country:"NO",code:"NOSVG",type:"sea",lat:58.97,lng:5.73 },
  // Denmark
  { name:"Copenhagen",country:"DK",code:"DKCPH",type:"sea",lat:55.68,lng:12.57 },
  { name:"Aarhus",country:"DK",code:"DKAAR",type:"sea",lat:56.15,lng:10.22 },
  // Estonia / Latvia / Lithuania
  { name:"Tallinn",country:"EE",code:"EETLL",type:"sea",lat:59.44,lng:24.75 },
  { name:"Riga",country:"LV",code:"LVRIX",type:"sea",lat:56.95,lng:24.11 },
  { name:"Klaipeda",country:"LT",code:"LTKLJ",type:"sea",lat:55.71,lng:21.13 },
  // Germany
  { name:"Hamburg",country:"DE",code:"DEHAM",type:"sea",lat:53.55,lng:9.99 },
  { name:"Bremerhaven",country:"DE",code:"DEBRV",type:"sea",lat:53.54,lng:8.58 },
  { name:"Wilhelmshaven",country:"DE",code:"DEWVN",type:"sea",lat:53.52,lng:8.14 },
  { name:"Frankfurt",country:"DE",code:"DEFRA",type:"air",lat:50.11,lng:8.68 },
  // Netherlands
  { name:"Rotterdam",country:"NL",code:"NLRTM",type:"sea",lat:51.92,lng:4.48 },
  { name:"Amsterdam",country:"NL",code:"NLAMS",type:"sea",lat:52.37,lng:4.90 },
  // Belgium
  { name:"Antwerp",country:"BE",code:"BEANR",type:"sea",lat:51.22,lng:4.40 },
  { name:"Zeebrugge",country:"BE",code:"BEZEE",type:"sea",lat:51.33,lng:3.20 },
  // UK
  { name:"Felixstowe",country:"GB",code:"GBFXT",type:"sea",lat:51.96,lng:1.35 },
  { name:"Southampton",country:"GB",code:"GBSOU",type:"sea",lat:50.90,lng:-1.40 },
  { name:"London Gateway",country:"GB",code:"GBLGP",type:"sea",lat:51.50,lng:0.47 },
  { name:"Liverpool",country:"GB",code:"GBLIV",type:"sea",lat:53.41,lng:-2.98 },
  { name:"London Heathrow",country:"GB",code:"GBLHR",type:"air",lat:51.47,lng:-0.46 },
  // France
  { name:"Le Havre",country:"FR",code:"FRLEH",type:"sea",lat:49.49,lng:0.11 },
  { name:"Marseille",country:"FR",code:"FRMRS",type:"sea",lat:43.30,lng:5.37 },
  { name:"Paris CDG",country:"FR",code:"FRCDG",type:"air",lat:49.01,lng:2.55 },
  // Spain / Portugal
  { name:"Barcelona",country:"ES",code:"ESBCN",type:"sea",lat:41.39,lng:2.17 },
  { name:"Valencia",country:"ES",code:"ESVLC",type:"sea",lat:39.47,lng:-0.32 },
  { name:"Algeciras",country:"ES",code:"ESALG",type:"sea",lat:36.13,lng:-5.45 },
  { name:"Lisbon",country:"PT",code:"PTLIS",type:"sea",lat:38.72,lng:-9.14 },
  // Italy
  { name:"Genoa",country:"IT",code:"ITGOA",type:"sea",lat:44.41,lng:8.93 },
  { name:"La Spezia",country:"IT",code:"ITSPE",type:"sea",lat:44.10,lng:9.82 },
  { name:"Gioia Tauro",country:"IT",code:"ITGIT",type:"sea",lat:38.43,lng:15.90 },
  // Poland
  { name:"Gdansk",country:"PL",code:"PLGDN",type:"sea",lat:54.35,lng:18.65 },
  { name:"Gdynia",country:"PL",code:"PLGDY",type:"sea",lat:54.52,lng:18.54 },
  // Greece / Turkey
  { name:"Piraeus",country:"GR",code:"GRPIR",type:"sea",lat:37.94,lng:23.64 },
  { name:"Istanbul",country:"TR",code:"TRIST",type:"sea",lat:41.01,lng:28.98 },
  { name:"Mersin",country:"TR",code:"TRMER",type:"sea",lat:36.80,lng:34.63 },
  // Middle East
  { name:"Dubai (Jebel Ali)",country:"AE",code:"AEJEA",type:"sea",lat:25.00,lng:55.06 },
  { name:"Abu Dhabi",country:"AE",code:"AEAUH",type:"sea",lat:24.45,lng:54.65 },
  { name:"Dammam",country:"SA",code:"SADMM",type:"sea",lat:26.43,lng:50.10 },
  { name:"Jeddah",country:"SA",code:"SAJED",type:"sea",lat:21.49,lng:39.19 },
  // India
  { name:"Mumbai (Nhava Sheva)",country:"IN",code:"INNSA",type:"sea",lat:18.95,lng:72.95 },
  { name:"Chennai",country:"IN",code:"INMAA",type:"sea",lat:13.08,lng:80.29 },
  { name:"Mundra",country:"IN",code:"INMUN",type:"sea",lat:22.74,lng:69.72 },
  // Southeast Asia
  { name:"Singapore",country:"SG",code:"SGSIN",type:"sea",lat:1.26,lng:103.84 },
  { name:"Port Klang",country:"MY",code:"MYPKG",type:"sea",lat:3.00,lng:101.39 },
  { name:"Tanjung Pelepas",country:"MY",code:"MYTPP",type:"sea",lat:1.36,lng:103.55 },
  { name:"Laem Chabang",country:"TH",code:"THLCH",type:"sea",lat:13.08,lng:100.88 },
  { name:"Ho Chi Minh City",country:"VN",code:"VNSGN",type:"sea",lat:10.82,lng:106.63 },
  { name:"Haiphong",country:"VN",code:"VNHPH",type:"sea",lat:20.86,lng:106.68 },
  { name:"Jakarta (Tanjung Priok)",country:"ID",code:"IDJKT",type:"sea",lat:-6.10,lng:106.88 },
  { name:"Manila",country:"PH",code:"PHMNL",type:"sea",lat:14.60,lng:120.97 },
  // China
  { name:"Shanghai",country:"CN",code:"CNSHA",type:"sea",lat:31.23,lng:121.47 },
  { name:"Ningbo",country:"CN",code:"CNNGB",type:"sea",lat:29.87,lng:121.54 },
  { name:"Shenzhen (Yantian)",country:"CN",code:"CNYAN",type:"sea",lat:22.57,lng:114.28 },
  { name:"Qingdao",country:"CN",code:"CNTAO",type:"sea",lat:36.07,lng:120.38 },
  { name:"Dalian",country:"CN",code:"CNDLC",type:"sea",lat:38.91,lng:121.60 },
  { name:"Tianjin (Xingang)",country:"CN",code:"CNTSN",type:"sea",lat:39.00,lng:117.73 },
  { name:"Xiamen",country:"CN",code:"CNXMN",type:"sea",lat:24.48,lng:118.09 },
  { name:"Guangzhou",country:"CN",code:"CNCAN",type:"sea",lat:23.13,lng:113.26 },
  { name:"Hong Kong",country:"HK",code:"HKHKG",type:"sea",lat:22.29,lng:114.15 },
  // Japan / Korea
  { name:"Tokyo (Yokohama)",country:"JP",code:"JPYOK",type:"sea",lat:35.44,lng:139.64 },
  { name:"Kobe",country:"JP",code:"JPUKB",type:"sea",lat:34.69,lng:135.20 },
  { name:"Nagoya",country:"JP",code:"JPNGO",type:"sea",lat:35.08,lng:136.88 },
  { name:"Busan",country:"KR",code:"KRPUS",type:"sea",lat:35.10,lng:129.04 },
  { name:"Incheon",country:"KR",code:"KRICN",type:"sea",lat:37.46,lng:126.57 },
  // Taiwan
  { name:"Kaohsiung",country:"TW",code:"TWKHH",type:"sea",lat:22.62,lng:120.31 },
  { name:"Taipei (Keelung)",country:"TW",code:"TWKEL",type:"sea",lat:25.13,lng:121.74 },
  // Australia / New Zealand
  { name:"Sydney",country:"AU",code:"AUSYD",type:"sea",lat:-33.87,lng:151.21 },
  { name:"Melbourne",country:"AU",code:"AUMEL",type:"sea",lat:-37.81,lng:144.96 },
  { name:"Brisbane",country:"AU",code:"AUBNE",type:"sea",lat:-27.47,lng:153.03 },
  { name:"Auckland",country:"NZ",code:"NZAKL",type:"sea",lat:-36.85,lng:174.76 },
  // North America
  { name:"New York (Newark)",country:"US",code:"USEWR",type:"sea",lat:40.68,lng:-74.14 },
  { name:"Los Angeles",country:"US",code:"USLAX",type:"sea",lat:33.74,lng:-118.26 },
  { name:"Long Beach",country:"US",code:"USLGB",type:"sea",lat:33.75,lng:-118.22 },
  { name:"Savannah",country:"US",code:"USSAV",type:"sea",lat:32.08,lng:-81.09 },
  { name:"Houston",country:"US",code:"USHOU",type:"sea",lat:29.76,lng:-95.36 },
  { name:"Charleston",country:"US",code:"USCHS",type:"sea",lat:32.78,lng:-79.93 },
  { name:"Norfolk",country:"US",code:"USORF",type:"sea",lat:36.85,lng:-76.29 },
  { name:"Seattle/Tacoma",country:"US",code:"USSEA",type:"sea",lat:47.27,lng:-122.35 },
  { name:"Miami",country:"US",code:"USMIA",type:"sea",lat:25.77,lng:-80.19 },
  { name:"New York (JFK)",country:"US",code:"USJFK",type:"air",lat:40.64,lng:-73.78 },
  { name:"Chicago (ORD)",country:"US",code:"USORD",type:"air",lat:41.97,lng:-87.91 },
  { name:"Montreal",country:"CA",code:"CAMTR",type:"sea",lat:45.50,lng:-73.57 },
  { name:"Vancouver",country:"CA",code:"CAVAN",type:"sea",lat:49.28,lng:-123.12 },
  { name:"Halifax",country:"CA",code:"CAHAL",type:"sea",lat:44.65,lng:-63.57 },
  // Central / South America
  { name:"Manzanillo",country:"MX",code:"MXZLO",type:"sea",lat:19.05,lng:-104.32 },
  { name:"Santos",country:"BR",code:"BRSSZ",type:"sea",lat:-23.95,lng:-46.30 },
  { name:"Buenos Aires",country:"AR",code:"ARBUE",type:"sea",lat:-34.61,lng:-58.38 },
  { name:"Callao",country:"PE",code:"PECLL",type:"sea",lat:-12.07,lng:-77.15 },
  { name:"Cartagena",country:"CO",code:"COCTG",type:"sea",lat:10.39,lng:-75.51 },
  { name:"Panama (Balboa)",country:"PA",code:"PABLB",type:"sea",lat:8.96,lng:-79.57 },
  // Africa
  { name:"Durban",country:"ZA",code:"ZADUR",type:"sea",lat:-29.86,lng:31.03 },
  { name:"Cape Town",country:"ZA",code:"ZACPT",type:"sea",lat:-33.92,lng:18.42 },
  { name:"Mombasa",country:"KE",code:"KEMBA",type:"sea",lat:-4.04,lng:39.67 },
  { name:"Lagos (Apapa)",country:"NG",code:"NGAPP",type:"sea",lat:6.45,lng:3.38 },
  { name:"Dar es Salaam",country:"TZ",code:"TZDAR",type:"sea",lat:-6.82,lng:39.29 },
  { name:"Casablanca",country:"MA",code:"MACAS",type:"sea",lat:33.59,lng:-7.62 },
  { name:"Alexandria",country:"EG",code:"EGALY",type:"sea",lat:31.20,lng:29.92 },
  { name:"Port Said",country:"EG",code:"EGPSD",type:"sea",lat:31.26,lng:32.30 },
];

/**
 * Search ports by query string. Returns top matches.
 */
export function searchPorts(query, limit = 8) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().trim();
  
  const results = PORTS.filter(p => {
    const nameMatch = p.name.toLowerCase().includes(q);
    const countryMatch = p.country.toLowerCase().includes(q);
    const codeMatch = p.code.toLowerCase().includes(q);
    return nameMatch || countryMatch || codeMatch;
  });

  // Sort: exact start matches first, then alphabetical
  results.sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
    const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return a.name.localeCompare(b.name);
  });

  return results.slice(0, limit);
}

/**
 * Get a port by name (case-insensitive).
 */
export function findPort(name) {
  if (!name) return null;
  const q = name.toLowerCase().trim();
  return PORTS.find(p => p.name.toLowerCase() === q) || null;
}

/**
 * Format port for display: "Helsinki, FI"
 */
export function formatPort(port) {
  if (typeof port === 'string') return port;
  return `${port.name}, ${port.country}`;
}

/**
 * Calculate great-circle distance between two points (km).
 */
export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate route distance through multiple ports.
 */
export function routeDistanceKm(portNames) {
  let total = 0;
  const resolved = portNames.map(n => findPort(n)).filter(Boolean);
  for (let i = 0; i < resolved.length - 1; i++) {
    total += distanceKm(resolved[i].lat, resolved[i].lng, resolved[i + 1].lat, resolved[i + 1].lng);
  }
  return { distance: total, ports: resolved };
}
