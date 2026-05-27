/**
 * Aggregates live European energy prices from multiple sources (electricity, oil, gas, carbon).
 * Supports GET with optional ?type= and ?country= filters; falls back to demo data.
 */
import { NextRequest, NextResponse } from 'next/server';

/**
 * Energy Prices API — Aggregates live European energy price data
 *
 * Sources:
 * - Energy-Charts (Fraunhofer ISE): Day-ahead electricity prices
 * - ENTSO-E Transparency Platform: Official EU electricity prices
 * - ECB Statistical Data Warehouse: Brent oil prices
 * - EIA API (optional): Oil/gas prices (set EIA_API_KEY env var)
 *
 * GET /api/energy-prices                          — all available prices
 * GET /api/energy-prices?type=electricity&country=DE  — electricity prices for Germany
 * GET /api/energy-prices?type=oil                 — Brent crude oil prices
 * GET /api/energy-prices?type=gas                 — TTF gas reference price
 */

interface PricePoint {
  timestamp: string;
  value: number;
  unit: string;
}

interface PriceData {
  type: string;
  label: string;
  source: string;
  country?: string;
  unit: string;
  latest?: number;
  prices: PricePoint[];
}

// ── Energy-Charts.info (Fraunhofer ISE) — Day-ahead electricity prices ──
async function fetchEnergyChartsPrices(country: string = 'de'): Promise<PriceData | null> {
  try {
    const url = `https://api.energy-charts.info/price?bzn=${country.toUpperCase()}-LU`;
    const res = await fetch(url, { next: { revalidate: 900 } });
    if (!res.ok) {
      // Try without -LU suffix
      const url2 = `https://api.energy-charts.info/price?bzn=${country.toUpperCase()}`;
      const res2 = await fetch(url2, { next: { revalidate: 900 } });
      if (!res2.ok) return null;
      const data = await res2.json();
      return parseEnergyChartsPrice(data, country);
    }
    const data = await res.json();
    return parseEnergyChartsPrice(data, country);
  } catch { return null; }
}

function parseEnergyChartsPrice(data: Record<string, unknown>, country: string): PriceData {
  const timestamps = (data.unix_seconds as number[]) || [];
  const prices = (data.price as number[]) || [];
  const points: PricePoint[] = [];

  for (let i = 0; i < Math.min(timestamps.length, prices.length); i++) {
    if (prices[i] !== null && prices[i] !== undefined) {
      points.push({
        timestamp: new Date(timestamps[i] * 1000).toISOString(),
        value: Math.round(prices[i] * 100) / 100,
        unit: 'EUR/MWh',
      });
    }
  }

  const latest = points.length > 0 ? points[points.length - 1].value : undefined;

  return {
    type: 'electricity',
    label: `Day-Ahead Electricity Price (${country.toUpperCase()})`,
    source: 'energy-charts.info (Fraunhofer ISE)',
    country: country.toUpperCase(),
    unit: 'EUR/MWh',
    latest,
    prices: points.slice(-48), // Last 48 hours
  };
}

// ── ECB Statistical Data Warehouse — Brent oil ─────────────────────────
async function fetchECBOilPrice(): Promise<PriceData | null> {
  try {
    const url = 'https://sdw-wsrest.ecb.europa.eu/service/data/FM/D.U2.EUR.4F.KR.OIL_BRENT.HSTA?lastNObservations=30&format=jsondata';
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();

    const observations = data?.dataSets?.[0]?.series?.['0:0:0:0:0:0:0']?.observations || {};
    const timePeriods = data?.structure?.dimensions?.observation?.[0]?.values || [];

    const points: PricePoint[] = [];
    for (const [idx, obs] of Object.entries(observations)) {
      const period = timePeriods[parseInt(idx)];
      if (period && Array.isArray(obs) && (obs as number[])[0] != null) {
        points.push({
          timestamp: period.start || period.id || '',
          value: Math.round((obs as number[])[0] * 100) / 100,
          unit: 'EUR/barrel',
        });
      }
    }

    const latest = points.length > 0 ? points[points.length - 1].value : undefined;

    return {
      type: 'oil',
      label: 'Brent Crude Oil',
      source: 'ECB Statistical Data Warehouse',
      unit: 'EUR/barrel',
      latest,
      prices: points,
    };
  } catch { return null; }
}

// ── EIA API (optional) — Natural gas ────────────────────────────────────
async function fetchEIAGasPrice(): Promise<PriceData | null> {
  const apiKey = process.env.EIA_API_KEY;
  if (!apiKey) return null;
  try {
    const url = `https://api.eia.gov/v2/natural-gas/pri/fut/data/?api_key=${apiKey}&frequency=daily&data[0]=value&facets[series][]=RNGC1&sort[0][column]=period&sort[0][direction]=desc&length=30`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    const points: PricePoint[] = (data?.response?.data || []).map((d: Record<string, string | number>) => ({
      timestamp: d.period as string,
      value: Math.round((d.value as number) * 100) / 100,
      unit: 'USD/MMBtu',
    }));

    return {
      type: 'gas',
      label: 'Henry Hub Natural Gas',
      source: 'U.S. EIA',
      unit: 'USD/MMBtu',
      latest: points[0]?.value,
      prices: points.reverse(),
    };
  } catch { return null; }
}

// ── Demo data when APIs are unavailable ─────────────────────────────────
function getDemoPrices(): PriceData[] {
  const now = Date.now();
  const hourMs = 3600000;

  return [
    {
      type: 'electricity',
      label: 'Day-Ahead Electricity Price (DE)',
      source: 'Demo data — set up Energy-Charts API connection for live prices',
      country: 'DE',
      unit: 'EUR/MWh',
      latest: 67.42,
      prices: Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(now - (23 - i) * hourMs).toISOString(),
        value: Math.round((55 + Math.sin(i / 3) * 25 + (Math.random() - 0.5) * 15) * 100) / 100,
        unit: 'EUR/MWh',
      })),
    },
    {
      type: 'electricity',
      label: 'Day-Ahead Electricity Price (FR)',
      source: 'Demo data',
      country: 'FR',
      unit: 'EUR/MWh',
      latest: 52.18,
      prices: Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(now - (23 - i) * hourMs).toISOString(),
        value: Math.round((42 + Math.sin(i / 3) * 20 + (Math.random() - 0.5) * 12) * 100) / 100,
        unit: 'EUR/MWh',
      })),
    },
    {
      type: 'oil',
      label: 'Brent Crude Oil',
      source: 'Demo data — ECB SDW provides live Brent prices',
      unit: 'EUR/barrel',
      latest: 71.35,
      prices: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(now - (29 - i) * 86400000).toISOString().split('T')[0],
        value: Math.round((68 + Math.sin(i / 5) * 6 + (Math.random() - 0.5) * 4) * 100) / 100,
        unit: 'EUR/barrel',
      })),
    },
    {
      type: 'gas',
      label: 'TTF Natural Gas (reference)',
      source: 'Demo data — set EIA_API_KEY for Henry Hub or GIE for EU gas storage',
      unit: 'EUR/MWh',
      latest: 34.20,
      prices: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(now - (29 - i) * 86400000).toISOString().split('T')[0],
        value: Math.round((30 + Math.sin(i / 4) * 8 + (Math.random() - 0.5) * 5) * 100) / 100,
        unit: 'EUR/MWh',
      })),
    },
    {
      type: 'carbon',
      label: 'EU ETS Carbon Price (EUA)',
      source: 'Demo data — Ember Climate provides historical EUA prices',
      unit: 'EUR/tCO2',
      latest: 68.50,
      prices: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(now - (29 - i) * 86400000).toISOString().split('T')[0],
        value: Math.round((62 + Math.sin(i / 6) * 10 + (Math.random() - 0.5) * 6) * 100) / 100,
        unit: 'EUR/tCO2',
      })),
    },
  ];
}

// ── Route handler ───────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type');
  const country = request.nextUrl.searchParams.get('country') || 'de';

  try {
    const results: PriceData[] = [];
    let isDemo = false;

    if (!type || type === 'electricity') {
      const elecData = await fetchEnergyChartsPrices(country);
      if (elecData) {
        results.push(elecData);
        // Also fetch FR and ES for comparison if fetching all
        if (!type) {
          const [fr, es] = await Promise.allSettled([
            fetchEnergyChartsPrices('fr'),
            fetchEnergyChartsPrices('es'),
          ]);
          if (fr.status === 'fulfilled' && fr.value) results.push(fr.value);
          if (es.status === 'fulfilled' && es.value) results.push(es.value);
        }
      }
    }

    if (!type || type === 'oil') {
      const oilData = await fetchECBOilPrice();
      if (oilData) results.push(oilData);
    }

    if (!type || type === 'gas') {
      const gasData = await fetchEIAGasPrice();
      if (gasData) results.push(gasData);
    }

    // If no live data available, return demo data
    if (results.length === 0) {
      isDemo = true;
      results.push(...getDemoPrices());
    }

    return NextResponse.json({
      count: results.length,
      isDemo,
      fetchedAt: new Date().toISOString(),
      prices: results,
      availableSources: {
        electricity: 'energy-charts.info (Fraunhofer ISE) — no API key needed',
        oil: 'ECB Statistical Data Warehouse — no API key needed',
        gas: 'EIA API — set EIA_API_KEY env var',
        carbon: 'Coming soon (Ember Climate data)',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
