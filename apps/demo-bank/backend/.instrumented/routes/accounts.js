"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _client = require("@radiator/client");
var _express = require("express");
var _accountService = require("../services/account-service.js");
const router = (0, _express.Router)();

// GET /api/accounts - List all accounts
router.get('/', (_req, res) => {
  try {
    (0, _client.enterFunction)("7c9a5cf25194cde2e1cf3488be7f884a75f2998fbaafb8f4c5f74a68603554a3", "anonymous", "/Users/yihein.chai/Documents/learn/rad/apps/demo-bank/backend/src/routes/accounts.ts");
    (0, _client.capture)("7c9a5cf25194cde2e1cf3488be7f884a75f2998fbaafb8f4c5f74a68603554a3", "_req", _req, {
      line: 0,
      column: 0
    });
    (0, _client.capture)("7c9a5cf25194cde2e1cf3488be7f884a75f2998fbaafb8f4c5f74a68603554a3", "res", res, {
      line: 0,
      column: 0
    });
    const accounts = (0, _accountService.getAllAccounts)();
    (0, _client.capture)("7c9a5cf25194cde2e1cf3488be7f884a75f2998fbaafb8f4c5f74a68603554a3", "accounts", accounts, {
      line: 8,
      column: 2
    });
    res.json({
      accounts
    });
  } catch (__rad_err) {
    (0, _client.onError)("7c9a5cf25194cde2e1cf3488be7f884a75f2998fbaafb8f4c5f74a68603554a3", __rad_err);
    throw __rad_err;
  } finally {
    (0, _client.exitFunction)("7c9a5cf25194cde2e1cf3488be7f884a75f2998fbaafb8f4c5f74a68603554a3");
  }
});

// GET /api/accounts/:id - Get single account
router.get('/:id', (req, res) => {
  try {
    (0, _client.enterFunction)("3471f25690bfe72551234e9d1f8c7f636a4ba26cc3aa9b056319b2b5b2828d78", "anonymous", "/Users/yihein.chai/Documents/learn/rad/apps/demo-bank/backend/src/routes/accounts.ts");
    (0, _client.capture)("3471f25690bfe72551234e9d1f8c7f636a4ba26cc3aa9b056319b2b5b2828d78", "req", req, {
      line: 0,
      column: 0
    });
    (0, _client.capture)("3471f25690bfe72551234e9d1f8c7f636a4ba26cc3aa9b056319b2b5b2828d78", "res", res, {
      line: 0,
      column: 0
    });
    const account = (0, _accountService.getAccountById)(req.params.id);
    (0, _client.capture)("3471f25690bfe72551234e9d1f8c7f636a4ba26cc3aa9b056319b2b5b2828d78", "account", account, {
      line: 14,
      column: 2
    });
    if (!account) {
      res.status(404).json({
        error: 'Account not found'
      });
      return;
    }
    res.json({
      account
    });
  } catch (__rad_err) {
    (0, _client.onError)("3471f25690bfe72551234e9d1f8c7f636a4ba26cc3aa9b056319b2b5b2828d78", __rad_err);
    throw __rad_err;
  } finally {
    (0, _client.exitFunction)("3471f25690bfe72551234e9d1f8c7f636a4ba26cc3aa9b056319b2b5b2828d78");
  }
});

// POST /api/accounts - Create new account
router.post('/', (req, res) => {
  try {
    (0, _client.enterFunction)("71da3cba49fb648d6b224ec6a478cb36f6272e484eaac8545e247cf524d2aab8", "anonymous", "/Users/yihein.chai/Documents/learn/rad/apps/demo-bank/backend/src/routes/accounts.ts");
    (0, _client.capture)("71da3cba49fb648d6b224ec6a478cb36f6272e484eaac8545e247cf524d2aab8", "req", req, {
      line: 0,
      column: 0
    });
    (0, _client.capture)("71da3cba49fb648d6b224ec6a478cb36f6272e484eaac8545e247cf524d2aab8", "res", res, {
      line: 0,
      column: 0
    });
    const {
      ownerId,
      ownerName,
      currency
    } = req.body;
    (0, _client.capture)("71da3cba49fb648d6b224ec6a478cb36f6272e484eaac8545e247cf524d2aab8", "ownerId", ownerId, {
      line: 24,
      column: 2
    });
    (0, _client.capture)("71da3cba49fb648d6b224ec6a478cb36f6272e484eaac8545e247cf524d2aab8", "ownerName", ownerName, {
      line: 24,
      column: 2
    });
    (0, _client.capture)("71da3cba49fb648d6b224ec6a478cb36f6272e484eaac8545e247cf524d2aab8", "currency", currency, {
      line: 24,
      column: 2
    });
    if (!ownerId || !ownerName) {
      res.status(400).json({
        error: 'ownerId and ownerName are required'
      });
      return;
    }
    const account = (0, _accountService.createAccount)(ownerId, ownerName, currency);
    (0, _client.capture)("71da3cba49fb648d6b224ec6a478cb36f6272e484eaac8545e247cf524d2aab8", "account", account, {
      line: 31,
      column: 2
    });
    res.status(201).json({
      account
    });
  } catch (__rad_err) {
    (0, _client.onError)("71da3cba49fb648d6b224ec6a478cb36f6272e484eaac8545e247cf524d2aab8", __rad_err);
    throw __rad_err;
  } finally {
    (0, _client.exitFunction)("71da3cba49fb648d6b224ec6a478cb36f6272e484eaac8545e247cf524d2aab8");
  }
});
var _default = exports.default = router;