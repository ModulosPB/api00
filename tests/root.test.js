import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('GET /api', () => {
  it('returns API metadata', async () => {
    const app = createApp();
    const res = await request(app).get('/api');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('api00');
    expect(Array.isArray(res.body.endpoints)).toBe(true);
  });
});

describe('GET /', () => {
  it('serves the static cocktails UI', async () => {
    const app = createApp();
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('api00 — Cocktails');
  });
});

describe('Unknown route', () => {
  it('returns 404 with JSON error', async () => {
    const app = createApp();
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not Found');
  });
});
