"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _client = require("@radiator/client");
var _express = require("express");
var _transferService = require("../services/transfer-service.js");
var _validationService = require("../services/validation-service.js");
const router = (0, _express.Router)();

// POST /api/transfers - Create a new transfer
router.post('/', (req, res) => {
  try {
    (0, _client.enterFunction)("34522775f73045c5e90f4242fa907662d5ed6c157565cf9fa29f76bbd715ea15", "anonymous", "/Users/yihein.chai/Documents/learn/rad/apps/demo-bank/backend/src/routes/transfers.ts");
    (0, _client.capture)("34522775f73045c5e90f4242fa907662d5ed6c157565cf9fa29f76bbd715ea15", "req", req, {
      line: 0,
      column: 0
    });
    (0, _client.capture)("34522775f73045c5e90f4242fa907662d5ed6c157565cf9fa29f76bbd715ea15", "res", res, {
      line: 0,
      column: 0
    });
    const {
      fromAccountId,
      toAccountId,
      amount,
      description
    } = req.body;

    // Basic validation
    (0, _client.capture)("34522775f73045c5e90f4242fa907662d5ed6c157565cf9fa29f76bbd715ea15", "fromAccountId", fromAccountId, {
      line: 9,
      column: 2
    });
    (0, _client.capture)("34522775f73045c5e90f4242fa907662d5ed6c157565cf9fa29f76bbd715ea15", "toAccountId", toAccountId, {
      line: 9,
      column: 2
    });
    (0, _client.capture)("34522775f73045c5e90f4242fa907662d5ed6c157565cf9fa29f76bbd715ea15", "amount", amount, {
      line: 9,
      column: 2
    });
    (0, _client.capture)("34522775f73045c5e90f4242fa907662d5ed6c157565cf9fa29f76bbd715ea15", "description", description, {
      line: 9,
      column: 2
    });
    if (!fromAccountId || !toAccountId || amount === undefined || !description) {
      res.status(400).json({
        error: 'fromAccountId, toAccountId, amount, and description are required'
      });
      return;
    }
    if (!(0, _validationService.validateAccountId)(fromAccountId)) {
      res.status(400).json({
        error: 'Invalid fromAccountId format'
      });
      return;
    }
    if (!(0, _validationService.validateAccountId)(toAccountId)) {
      res.status(400).json({
        error: 'Invalid toAccountId format'
      });
      return;
    }
    if (fromAccountId === toAccountId) {
      res.status(400).json({
        error: 'Cannot transfer to the same account'
      });
      return;
    }
    if (!(0, _validationService.validateDescription)(description)) {
      res.status(400).json({
        error: 'Description is required and must be under 200 characters'
      });
      return;
    }
    const transfer = (0, _transferService.processTransfer)(fromAccountId, toAccountId, amount, description);
    (0, _client.capture)("34522775f73045c5e90f4242fa907662d5ed6c157565cf9fa29f76bbd715ea15", "transfer", transfer, {
      line: 37,
      column: 2
    });
    if (transfer.status === 'failed') {
      res.status(422).json({
        transfer,
        error: 'Transfer failed'
      });
      return;
    }
    res.status(201).json({
      transfer
    });
  } catch (__rad_err) {
    (0, _client.onError)("34522775f73045c5e90f4242fa907662d5ed6c157565cf9fa29f76bbd715ea15", __rad_err);
    throw __rad_err;
  } finally {
    (0, _client.exitFunction)("34522775f73045c5e90f4242fa907662d5ed6c157565cf9fa29f76bbd715ea15");
  }
});

// GET /api/transfers - List all transfers (optionally filter by accountId)
router.get('/', (req, res) => {
  try {
    (0, _client.enterFunction)("d86988972c6bac524ab700d41060fc820741ebb4e26108fb63a9954301e85dda", "anonymous", "/Users/yihein.chai/Documents/learn/rad/apps/demo-bank/backend/src/routes/transfers.ts");
    (0, _client.capture)("d86988972c6bac524ab700d41060fc820741ebb4e26108fb63a9954301e85dda", "req", req, {
      line: 0,
      column: 0
    });
    (0, _client.capture)("d86988972c6bac524ab700d41060fc820741ebb4e26108fb63a9954301e85dda", "res", res, {
      line: 0,
      column: 0
    });
    const {
      accountId
    } = req.query;
    (0, _client.capture)("d86988972c6bac524ab700d41060fc820741ebb4e26108fb63a9954301e85dda", "accountId", accountId, {
      line: 49,
      column: 2
    });
    if (accountId && typeof accountId === 'string') {
      const filtered = (0, _transferService.getTransfersByAccountId)(accountId);
      res.json({
        transfers: filtered
      });
      return;
    }
    const allTransfers = (0, _transferService.getAllTransfers)();
    (0, _client.capture)("d86988972c6bac524ab700d41060fc820741ebb4e26108fb63a9954301e85dda", "allTransfers", allTransfers, {
      line: 57,
      column: 2
    });
    res.json({
      transfers: allTransfers
    });
  } catch (__rad_err) {
    (0, _client.onError)("d86988972c6bac524ab700d41060fc820741ebb4e26108fb63a9954301e85dda", __rad_err);
    throw __rad_err;
  } finally {
    (0, _client.exitFunction)("d86988972c6bac524ab700d41060fc820741ebb4e26108fb63a9954301e85dda");
  }
});
var _default = exports.default = router;