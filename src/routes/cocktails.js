import { Router } from 'express';

const router = Router();

const BASE = 'https://www.thecocktaildb.com/api/json/v1/1';
const TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;
const USER_AGENT = 'api00/0.1.0 (+https://github.com/ModulosPB/api00)';

const cache = new Map();

export function _clearCocktailsCache() {
  cache.clear();
}

function parseDrink(drink) {
  const ingredients = [];
  for (let i = 1; i <= 15; i += 1) {
    const name = drink[`strIngredient${i}`];
    const measure = drink[`strMeasure${i}`];
    if (name && String(name).trim()) {
      ingredients.push({
        name: String(name).trim(),
        measure: measure ? String(measure).trim() : null,
      });
    }
  }
  return {
    id: drink.idDrink,
    name: drink.strDrink,
    category: drink.strCategory ?? null,
    glass: drink.strGlass ?? null,
    thumbnail: drink.strDrinkThumb ?? null,
    ingredients,
  };
}

function isTimeoutError(err) {
  return err?.name === 'TimeoutError' || err?.name === 'AbortError';
}

router.get('/', async (req, res) => {
  const letter = String(req.query.letter ?? 'a').toLowerCase();
  if (!/^[a-z]$/.test(letter)) {
    return res.status(400).json({
      error: 'Query parameter "letter" must be a single character a-z.',
    });
  }

  const cached = cache.get(letter);
  if (cached && Date.now() - cached.at < TTL_MS) {
    return res.json(cached.data);
  }

  if (typeof fetch !== 'function') {
    return res.status(500).json({
      error: 'Global fetch is not available. Node.js >= 18 is required.',
    });
  }

  const url = `${BASE}/search.php?f=${letter}`;
  let upstream;
  try {
    upstream = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      console.error(`[cocktails] upstream timed out after ${FETCH_TIMEOUT_MS}ms: ${url}`);
      return res.status(504).json({
        error: `Upstream thecocktaildb timed out after ${FETCH_TIMEOUT_MS}ms.`,
      });
    }
    console.error(`[cocktails] upstream fetch failed: ${err?.message || err}`);
    return res.status(502).json({
      error: 'Upstream thecocktaildb unreachable.',
      detail: err?.message || String(err),
    });
  }

  if (!upstream.ok) {
    console.error(`[cocktails] upstream returned ${upstream.status} for ${url}`);
    return res.status(502).json({
      error: 'Upstream thecocktaildb error',
      status: upstream.status,
    });
  }

  let body;
  try {
    body = await upstream.json();
  } catch (err) {
    console.error(`[cocktails] upstream returned non-JSON body: ${err?.message || err}`);
    return res.status(502).json({
      error: 'Upstream thecocktaildb returned an invalid JSON response.',
    });
  }

  const drinks = Array.isArray(body?.drinks) ? body.drinks : [];
  const data = drinks.map(parseDrink);
  cache.set(letter, { at: Date.now(), data });
  return res.json(data);
});

export default router;
