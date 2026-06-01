/**
 * Eurostat JSON-stat client for the Project Workspace indicator-refresh path.
 * --------------------------------------------------------------------------
 * Eurostat's dissemination REST API returns JSON-stat 2.0:
 *   https://wikis.ec.europa.eu/display/EUROSTATHELP/Web+Services+JSON+API
 *
 * For indicators where every non-time dimension has been pinned to a single
 * code, the response collapses to a one-dimensional series indexed by year.
 * That is the only shape we use here — multi-dimensional aggregation is
 * the caller's responsibility (it picks dimension filters when registering
 * the live source).
 *
 * Behaviour:
 *   - All known datasets are EU-27 aggregates (geo=EU27_2020).
 *   - Years with a null value (Eurostat flags them as ":") are skipped.
 *   - Network or parse failures throw — callers should surface the message
 *     to the user rather than silently retain stale points.
 */
import 'server-only';

export interface EurostatPoint {
  year: number;
  value: number;
}

interface JsonStat {
  value: Record<string, number | null> | (number | null)[];
  dimension: Record<
    string,
    { category: { index: Record<string, number> | string[] } }
  >;
  id?: string[]; // dimension order
  size?: number[];
}

const BASE =
  'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';

export async function fetchEurostatSeries(
  dataset: string,
  filters: Record<string, string>,
  signal?: AbortSignal
): Promise<EurostatPoint[]> {
  const params = new URLSearchParams({ format: 'JSON', lang: 'EN', ...filters });
  const url = `${BASE}/${encodeURIComponent(dataset)}?${params.toString()}`;
  const res = await fetch(url, {
    headers: { accept: 'application/json' },
    signal,
    // Avoid Next's fetch cache layer — refreshes are explicit user actions.
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Eurostat ${dataset} returned ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as JsonStat;
  return parseSeries(json);
}

/** Parse a JSON-stat response collapsed along every dimension except `time`. */
function parseSeries(json: JsonStat): EurostatPoint[] {
  const timeDim = json.dimension?.time?.category?.index;
  if (!timeDim) {
    throw new Error('Eurostat response missing time dimension');
  }

  // index can be either { "2020": 0, "2021": 1, … } or a string[].
  const yearByIndex = new Map<number, number>(); // flat index -> year
  if (Array.isArray(timeDim)) {
    timeDim.forEach((y, i) => yearByIndex.set(i, Number(y)));
  } else {
    for (const [y, i] of Object.entries(timeDim)) yearByIndex.set(Number(i), Number(y));
  }

  // Compute the size product of non-time dimensions. We *expect* it to be 1
  // (caller pinned them) — if not, we just take the first slice along time.
  const ids = json.id ?? Object.keys(json.dimension);
  const sizes = json.size ?? ids.map(id => {
    const idx = json.dimension[id]?.category?.index;
    if (Array.isArray(idx)) return idx.length;
    return Object.keys(idx ?? {}).length;
  });
  const timePos = ids.indexOf('time');
  if (timePos < 0) throw new Error('Eurostat response: "time" not in id list');
  const timeSize = sizes[timePos] ?? yearByIndex.size;

  // Stride for the time dimension = product of sizes of every dim AFTER it.
  let timeStride = 1;
  for (let i = timePos + 1; i < sizes.length; i++) timeStride *= sizes[i] ?? 1;

  const points: EurostatPoint[] = [];
  for (let ti = 0; ti < timeSize; ti++) {
    const year = yearByIndex.get(ti);
    if (year == null) continue;
    const flat = ti * timeStride; // first slice along all other dims (all sized 1)
    const raw = Array.isArray(json.value)
      ? json.value[flat]
      : json.value[String(flat)];
    if (raw == null) continue;
    const v = Number(raw);
    if (Number.isFinite(v)) points.push({ year, value: v });
  }
  return points.sort((a, b) => a.year - b.year);
}
