import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { _clearCocktailsCache } from '../src/routes/cocktails.js';

describe('GET /api/cocktails', () => {
  beforeEach(() => {
    _clearCocktailsCache();
    vi.restoreAllMocks();
  });

  it('returns a parsed list of cocktails with ingredients for a given letter', async () => {
    const fakeDrink = {
      idDrink: '11007',
      strDrink: 'Margarita',
      strCategory: 'Ordinary Drink',
      strGlass: 'Cocktail glass',
      strDrinkThumb: 'https://example.com/m.jpg',
      strIngredient1: 'Tequila',
      strMeasure1: '1 1/2 oz ',
      strIngredient2: 'Triple sec',
      strMeasure2: '1/2 oz ',
      strIngredient3: 'Lime juice',
      strMeasure3: '1 oz ',
      strIngredient4: 'Salt',
      strMeasure4: null,
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ drinks: [fakeDrink] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const app = createApp();
    const res = await request(app).get('/api/cocktails?letter=m');

    expect(res.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://www.thecocktaildb.com/api/json/v1/1/search.php?f=m',
    );
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      id: '11007',
      name: 'Margarita',
      category: 'Ordinary Drink',
      glass: 'Cocktail glass',
    });
    expect(res.body[0].ingredients).toEqual([
      { name: 'Tequila', measure: '1 1/2 oz' },
      { name: 'Triple sec', measure: '1/2 oz' },
      { name: 'Lime juice', measure: '1 oz' },
      { name: 'Salt', measure: null },
    ]);
  });

  it('returns an empty array when upstream returns null drinks', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ drinks: null }) }),
    );
    const app = createApp();
    const res = await request(app).get('/api/cocktails?letter=z');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('defaults to letter "a" when no query param is provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ drinks: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const app = createApp();
    const res = await request(app).get('/api/cocktails');
    expect(res.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://www.thecocktaildb.com/api/json/v1/1/search.php?f=a',
    );
  });

  it('rejects invalid letters with 400', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const app = createApp();
    const res = await request(app).get('/api/cocktails?letter=AB');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/letter/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 502 when upstream responds with error status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }),
    );
    const app = createApp();
    const res = await request(app).get('/api/cocktails?letter=b');
    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/thecocktaildb/i);
  });

  it('returns 504 when upstream fetch times out / is aborted', async () => {
    const abortErr = new Error('The operation was aborted due to timeout');
    abortErr.name = 'TimeoutError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortErr));
    const app = createApp();
    const res = await request(app).get('/api/cocktails?letter=d');
    expect(res.status).toBe(504);
    expect(res.body.error).toMatch(/timed out/i);
  });

  it('returns 502 when upstream fetch throws a generic network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ENOTFOUND')));
    const app = createApp();
    const res = await request(app).get('/api/cocktails?letter=e');
    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/unreachable/i);
    expect(res.body.detail).toBe('ENOTFOUND');
  });

  it('returns 502 when upstream body is not valid JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON');
        },
      }),
    );
    const app = createApp();
    const res = await request(app).get('/api/cocktails?letter=f');
    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/invalid json/i);
  });

  it('sends a User-Agent header and an AbortSignal to the upstream', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ drinks: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const app = createApp();
    await request(app).get('/api/cocktails?letter=g');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers['User-Agent']).toMatch(/api00/);
    expect(options.headers.Accept).toBe('application/json');
    expect(options.signal).toBeDefined();
  });

  it('skips null entries in the upstream drinks array without crashing', async () => {
    const validDrink = {
      idDrink: '1',
      strDrink: 'Negroni',
      strIngredient1: 'Gin',
      strMeasure1: '1 oz',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ drinks: [null, validDrink, null] }),
      }),
    );
    const app = createApp();
    const res = await request(app).get('/api/cocktails?letter=n');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Negroni');
  });

  it('caches responses per letter (upstream called once for repeated requests)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ drinks: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const app = createApp();
    await request(app).get('/api/cocktails?letter=h');
    await request(app).get('/api/cocktails?letter=h');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
