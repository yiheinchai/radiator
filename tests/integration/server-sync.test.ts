/**
 * Integration test: Server API sync flow
 *
 * Tests the full server API lifecycle:
 * 1. Register user → get auth token
 * 2. Create codebase
 * 3. Push snapshots via API
 * 4. Query snapshots via API
 * 5. Batch operations
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '@radiator/server';
import { getDatabase, closeDatabase } from '@radiator/server';
import type { FunctionTypeSnapshot } from '@radiator/common';
import { hashFunctionAST } from '@radiator/common';
import request from 'supertest';
import type { Express } from 'express';

describe('Server Sync Flow', () => {
  let app: Express;
  let authToken: string;
  let orgId: string;
  let codebaseId: string;

  beforeAll(() => {
    // Initialize in-memory database before app routes access it
    getDatabase(':memory:');
    app = createApp();
  });

  afterAll(() => {
    closeDatabase();
  });

  it('registers a new user and gets an auth token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@radiator.dev',
        password: 'test-password-123',
        orgName: 'Test Org',
      })
      .expect(201);

    expect(res.body.token).toBeTruthy();
    expect(res.body.userId).toBeTruthy();
    expect(res.body.orgId).toBeTruthy();

    authToken = res.body.token;
    orgId = res.body.orgId;
  });

  it('rejects duplicate registration', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@radiator.dev',
        password: 'another-password',
        orgName: 'Another Org',
      })
      .expect(409);
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@radiator.dev',
        password: 'test-password-123',
      })
      .expect(200);

    expect(res.body.token).toBeTruthy();
    expect(res.body.orgId).toBe(orgId);
  });

  it('rejects login with wrong credentials', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@radiator.dev',
        password: 'wrong-password',
      })
      .expect(401);
  });

  it('rejects unauthenticated requests', async () => {
    await request(app).get('/api/codebases').expect(401);
    await request(app).get('/api/snapshots/some-hash').expect(401);
    await request(app).get('/api/errors').expect(401);
  });

  it('creates a codebase', async () => {
    const res = await request(app)
      .post('/api/codebases')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'test-project' })
      .expect(201);

    expect(res.body.id).toBeTruthy();
    expect(res.body.name).toBe('test-project');
    codebaseId = res.body.id;
  });

  it('lists codebases for the org', async () => {
    const res = await request(app)
      .get('/api/codebases')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('test-project');
  });

  it('stores a snapshot via API', async () => {
    const functionHash = hashFunctionAST(`function greet(name) { return "Hello " + name; }`);

    const snapshot: FunctionTypeSnapshot = {
      functionHash,
      functionName: 'greet',
      filePath: 'greet.ts',
      parameters: [
        {
          name: 'name',
          type: { kind: 'primitive', name: 'string', examples: ['"Alice"'] },
          location: { line: 0, column: 0 },
          captureTimestamp: Date.now(),
        },
      ],
      localVariables: [],
      returnValue: {
        name: '__return',
        type: { kind: 'primitive', name: 'string', examples: ['"Hello Alice"'] },
        location: { line: 0, column: 0 },
        captureTimestamp: Date.now(),
      },
      captureMode: 'normal',
      timestamp: Date.now(),
      sampleCount: 1,
    };

    const res = await request(app)
      .post('/api/snapshots')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ codebaseId, snapshot })
      .expect(201);

    expect(res.body.id).toBeTruthy();
    expect(res.body.created).toBe(true);
  });

  it('retrieves a snapshot by function hash', async () => {
    const functionHash = hashFunctionAST(`function greet(name) { return "Hello " + name; }`);

    const res = await request(app)
      .get(`/api/snapshots/${functionHash}`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ codebaseId })
      .expect(200);

    expect(res.body.functionHash).toBe(functionHash);
    expect(res.body.functionName).toBe('greet');
    expect(res.body.parameters).toHaveLength(1);
    expect(res.body.parameters[0].name).toBe('name');
  });

  it('returns 404 for non-existent snapshot', async () => {
    await request(app)
      .get('/api/snapshots/nonexistent-hash')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);
  });

  it('stores batch snapshots', async () => {
    const hash1 = hashFunctionAST(`function foo(x) { return x + 1; }`);
    const hash2 = hashFunctionAST(`function bar(y) { return y * 2; }`);

    const snapshots: FunctionTypeSnapshot[] = [
      {
        functionHash: hash1,
        functionName: 'foo',
        filePath: 'math.ts',
        parameters: [{
          name: 'x',
          type: { kind: 'primitive', name: 'number', examples: ['1'] },
          location: { line: 0, column: 0 },
          captureTimestamp: Date.now(),
        }],
        localVariables: [],
        captureMode: 'normal',
        timestamp: Date.now(),
        sampleCount: 1,
      },
      {
        functionHash: hash2,
        functionName: 'bar',
        filePath: 'math.ts',
        parameters: [{
          name: 'y',
          type: { kind: 'primitive', name: 'number', examples: ['5'] },
          location: { line: 0, column: 0 },
          captureTimestamp: Date.now(),
        }],
        localVariables: [],
        captureMode: 'normal',
        timestamp: Date.now(),
        sampleCount: 1,
      },
    ];

    const res = await request(app)
      .post('/api/snapshots/batch')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ codebaseId, snapshots })
      .expect(200);

    expect(res.body.results).toHaveLength(2);

    // Verify both are retrievable
    const res1 = await request(app)
      .get(`/api/snapshots/${hash1}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(res1.body.functionName).toBe('foo');

    const res2 = await request(app)
      .get(`/api/snapshots/${hash2}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(res2.body.functionName).toBe('bar');
  });

  it('updates existing snapshot on re-store', async () => {
    const functionHash = hashFunctionAST(`function greet(name) { return "Hello " + name; }`);

    const updatedSnapshot: FunctionTypeSnapshot = {
      functionHash,
      functionName: 'greet',
      filePath: 'greet.ts',
      parameters: [
        {
          name: 'name',
          type: { kind: 'primitive', name: 'string', examples: ['"Bob"'] },
          location: { line: 0, column: 0 },
          captureTimestamp: Date.now(),
        },
      ],
      localVariables: [],
      captureMode: 'normal',
      timestamp: Date.now(),
      sampleCount: 5,
    };

    const res = await request(app)
      .post('/api/snapshots')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ codebaseId, snapshot: updatedSnapshot })
      .expect(200);

    expect(res.body.updated).toBe(true);
  });

  it('health check works without auth', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeTruthy();
  });
});
