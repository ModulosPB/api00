import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('GET /', () => {
  it('returns API metadata', async () => {
    const app = createApp();
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('api00');
    expect(Array.isArray(res.body.endpoints)).toBe(true);
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
