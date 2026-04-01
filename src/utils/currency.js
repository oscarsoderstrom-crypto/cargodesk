/**
 * Currency conversion utility.
 * Fetches live rates from a free API, falls back to cached rates if offline.
 */

const FALLBACK_RATES = {
  EUR: 1,
  USD: 1.08,
  SEK: 11.42,
  GBP: 0.86,
  NOK: 11.65,
  DKK: 7.46,
  CNY: 7.82,
};

const CACHE_KEY = 'cargodesk_fx_rates';
const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours

function getCachedRates() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const data = JSON.parse(cached);
    if (Date.now() - data.timestamp < CACHE_DURATION) {
      return data.rates;
    }
  } catch (e) {}
  return null;
}

function setCachedRates(rates) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      rates,
      timestamp: Date.now(),
    }));
  } catch (e) {}
}

/**
 * Fetch current exchange rates with EUR as base.
 * Returns an object like { EUR: 1, USD: 1.08, SEK: 11.42, ... }
 */
export async function fetchRates() {
  // Check cache first
  const cached = getCachedRates();
  if (cached) return cached;

  try {
    // Free API, no key required, 1500 requests/month
    const resp = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
    if (!resp.ok) throw new Error('Rate fetch failed');
    const data = await resp.json();

    const rates = {
      EUR: 1,
      USD: data.rates.USD || FALLBACK_RATES.USD,
      SEK: data.rates.SEK || FALLBACK_RATES.SEK,
      GBP: data.rates.GBP || FALLBACK_RATES.GBP,
      NOK: data.rates.NOK || FALLBACK_RATES.NOK,
      DKK: data.rates.DKK || FALLBACK_RATES.DKK,
      CNY: data.rates.CNY || FALLBACK_RATES.CNY,
    };

    setCachedRates(rates);
    return rates;
  } catch (e) {
    // Offline or API down — use cache or fallback
    const cached2 = getCachedRates();
    return cached2 || FALLBACK_RATES;
  }
}

/**
 * Convert an amount to EUR.
 */
export function toEUR(amount, currency, rates = FALLBACK_RATES) {
  if (currency === 'EUR') return amount;
  const rate = rates[currency];
  if (!rate) return amount;
  return amount / rate;
}

/**
 * Convert from EUR to target currency.
 */
export function fromEUR(amountInEUR, targetCurrency, rates = FALLBACK_RATES) {
  if (targetCurrency === 'EUR') return amountInEUR;
  const rate = rates[targetCurrency];
  if (!rate) return amountInEUR;
  return amountInEUR * rate;
}

/**
 * Format as currency string.
 */
export function formatCurrency(amount, currency = 'EUR') {
  return new Intl.NumberFormat('fi-FI', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatEUR(amount) {
  return formatCurrency(amount, 'EUR');
}

export const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'SEK', 'GBP', 'NOK', 'DKK', 'CNY'];

export { FALLBACK_RATES };
