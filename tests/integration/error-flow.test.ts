/**
 * Integration test: Error capture → Server storage → Query
 *
 * Tests the error monitoring pipeline:
 * 1. CaptureManager captures an error with full variable state
 * 2. Error snapshot is pushed to the server
 * 3. Error appears in error logs via API
 * 4. Error detail includes the full snapshot
 * 5. Timeline aggregation works correctly
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '@radiator/server';
import { getDatabase, closeDatabase } from '@radiator/server';
import { CaptureManager } from '@radiator/core';
import { hashFunctionAST } from '@radiator/common';
import type { FunctionTypeSnapshot } from '@radiator/common';
import request from 'supertest';
import type { Express } from 'express';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('Error Flow: Capture → Server → Query', () => {
  let app: Express;
  let authToken: string;
  let codebaseId: string;
  let tempDir: string;
  let manager: CaptureManager;

  beforeAll(async () => {
    // Set up server with in-memory database
    getDatabase(':memory:');
    app = createApp();

    // Register and create codebase
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'error-test@radiator.dev',
        password: 'test-password',
        orgName: 'Error Test Org',
      });
    authToken = regRes.body.token;

    const cbRes = await request(app)
      .post('/api/codebases')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'error-test-project' });
    codebaseId = cbRes.body.id;

    // Set up local capture manager
    tempDir = await mkdtemp(join(tmpdir(), 'radiator-error-integ-'));
    manager = new CaptureManager({
      radiatorDir: tempDir,
      flushIntervalMs: 0,
    });
    await manager.init();
  });

  afterAll(async () => {
    await manager.shutdown();
    await rm(tempDir, { recursive: true, force: true });
    closeDatabase();
  });

  it('captures an error locally with full variable state', () => {
    const hash = hashFunctionAST(`function processPayment(account, amount) {
      const fee = amount * 0.03;
      const total = amount + fee;
      account.balance -= total;
      return account;
    }`);

    // Simulate the function execution that hits an error
    manager.enterFunction(hash, 'processPayment', 'payment.ts');
    manager.capture(hash, 'account', { id: 'acc-005', balance: null, currency: 'USD' }, { line: 0, column: 0 });
    manager.capture(hash, 'amount', 100, { line: 0, column: 20 });
    manager.capture(hash, 'fee', 3, { line: 2, column: 8 });
    manager.capture(hash, 'total', 103, { line: 3, column: 8 });
    manager.onFunctionError(hash, new TypeError('Cannot read property of null'));

    const snapshot = manager.getSnapshot(hash);
    expect(snapshot).not.toBeNull();
    expect(snapshot!.captureMode).toBe('error');
    expect(snapshot!.error).toBeDefined();
    expect(snapshot!.error!.name).toBe('TypeError');

    // All variables at time of error should be captured
    const allVars = [...snapshot!.parameters, ...snapshot!.localVariables];
    const varNames = allVars.map(v => v.name);
    expect(varNames).toContain('account');
    expect(varNames).toContain('amount');
    expect(varNames).toContain('fee');
    expect(varNames).toContain('total');

    // The account variable should show the null balance
    const accountVar = allVars.find(v => v.name === 'account');
    expect(accountVar!.type.kind).toBe('object');
    // properties is Record<string, RadiatorType>
    const balanceProp = accountVar!.type.properties?.['balance'];
    expect(balanceProp).toBeDefined();
    expect(balanceProp!.kind).toBe('null');
    expect(balanceProp!.name).toBe('null');
  });

  it('pushes error snapshot to server and creates error log', async () => {
    const hash = hashFunctionAST(`function processPayment(account, amount) {
      const fee = amount * 0.03;
      const total = amount + fee;
      account.balance -= total;
      return account;
    }`);

    const snapshot = manager.getSnapshot(hash)!;

    // Push snapshot to server
    const storeRes = await request(app)
      .post('/api/snapshots')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ codebaseId, snapshot })
      .expect(201);

    expect(storeRes.body.id).toBeTruthy();
  });

  it('lists errors from the API', async () => {
    const res = await request(app)
      .get('/api/errors')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ codebaseId })
      .expect(200);

    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.length).toBeGreaterThanOrEqual(1);
    expect(res.body.total).toBeGreaterThanOrEqual(1);

    const error = res.body.errors[0];
    expect(error.error_name).toBe('TypeError');
    expect(error.error_message).toBe('Cannot read property of null');
    expect(error.function_name).toBe('processPayment');
    expect(error.file_path).toBe('payment.ts');
  });

  it('retrieves error detail with full snapshot', async () => {
    // Get the error ID from the list
    const listRes = await request(app)
      .get('/api/errors')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ codebaseId });

    const errorId = listRes.body.errors[0].id;

    const detailRes = await request(app)
      .get(`/api/errors/${errorId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(detailRes.body.error).toBeDefined();
    expect(detailRes.body.snapshot).toBeDefined();

    // Snapshot should contain the variable state at error time
    const snapshot = detailRes.body.snapshot;
    expect(snapshot.captureMode).toBe('error');
    expect(snapshot.error.name).toBe('TypeError');
    expect(snapshot.parameters.length + snapshot.localVariables.length).toBeGreaterThan(0);
  });

  it('supports multiple error types and filtering', async () => {
    // Push a different type of error
    const hash2 = hashFunctionAST(`function validateInput(data) { return data.length > 0; }`);

    manager.enterFunction(hash2, 'validateInput', 'validation.ts');
    manager.capture(hash2, 'data', undefined, { line: 0, column: 0 });
    manager.onFunctionError(hash2, new RangeError('Invalid array length'));

    const snapshot2 = manager.getSnapshot(hash2)!;

    await request(app)
      .post('/api/snapshots')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ codebaseId, snapshot: snapshot2 })
      .expect(201);

    // Filter by error name
    const typeErrorRes = await request(app)
      .get('/api/errors')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ codebaseId, errorName: 'TypeError' })
      .expect(200);

    expect(typeErrorRes.body.errors.every((e: any) => e.error_name === 'TypeError')).toBe(true);

    const rangeErrorRes = await request(app)
      .get('/api/errors')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ codebaseId, errorName: 'RangeError' })
      .expect(200);

    expect(rangeErrorRes.body.errors.every((e: any) => e.error_name === 'RangeError')).toBe(true);
  });

  it('supports time-range filtering', async () => {
    const now = Date.now();

    // Errors in the last 24 hours
    const res = await request(app)
      .get('/api/errors')
      .set('Authorization', `Bearer ${authToken}`)
      .query({
        codebaseId,
        since: now - 24 * 60 * 60 * 1000,
        until: now + 1000,
      })
      .expect(200);

    expect(res.body.errors.length).toBeGreaterThan(0);

    // Errors from far in the future (should be empty)
    const futureRes = await request(app)
      .get('/api/errors')
      .set('Authorization', `Bearer ${authToken}`)
      .query({
        codebaseId,
        since: now + 86400000,
        until: now + 86400000 * 2,
      })
      .expect(200);

    expect(futureRes.body.errors).toHaveLength(0);
  });

  it('returns timeline data for error aggregation', async () => {
    const now = Date.now();

    const res = await request(app)
      .get(`/api/errors/timeline/${codebaseId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({
        since: now - 60 * 60 * 1000,
        until: now + 1000,
        buckets: 10,
      })
      .expect(200);

    expect(res.body.timeline).toBeDefined();
    expect(res.body.timeline).toHaveLength(10);

    // At least one bucket should have errors
    const totalErrors = res.body.timeline.reduce((sum: number, b: any) => sum + b.count, 0);
    expect(totalErrors).toBeGreaterThan(0);
  });
});
