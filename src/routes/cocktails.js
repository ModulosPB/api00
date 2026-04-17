import { Router } from 'express';

const router = Router();

const BASE = 'https://www.thecocktaildb.com/api/json/v1/1';
const TTL_MS = 10 * 60 * 1000;
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

router.get('/', async (req, res, next) => {
  try {
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

    const upstream = await fetch(`${BASE}/search.php?f=${letter}`);
    if (!upstream.ok) {
      return res.status(502).json({
        error: 'Upstream thecocktaildb error',
        status: upstream.status,
      });
    }
    const body = await upstream.json();
    const drinks = Array.isArray(body?.drinks) ? body.drinks : [];
    const data = drinks.map(parseDrink);
    cache.set(letter, { at: Date.now(), data });
    return res.json(data);
  } catch (err) {
    return next(err);
  }
});

export default router;
