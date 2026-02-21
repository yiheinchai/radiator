"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.transfers = exports.accounts = void 0;
var _client = require("@radiator/client");
const accounts = exports.accounts = [{
  id: 'acc-001',
  ownerId: 'user-001',
  ownerName: 'Alice Johnson',
  balance: 5200.5,
  currency: 'USD',
  createdAt: Date.now() - 86400000 * 30
}, {
  id: 'acc-002',
  ownerId: 'user-002',
  ownerName: 'Bob Smith',
  balance: 12750.0,
  currency: 'USD',
  createdAt: Date.now() - 86400000 * 60
}, {
  id: 'acc-003',
  ownerId: 'user-003',
  ownerName: 'Charlie Davis',
  balance: 340.75,
  currency: 'USD',
  createdAt: Date.now() - 86400000 * 15
}, {
  id: 'acc-004',
  ownerId: 'user-004',
  ownerName: 'Diana Lee',
  balance: 89200.0,
  currency: 'USD',
  createdAt: Date.now() - 86400000 * 90
}, {
  id: 'acc-005',
  ownerId: 'user-005',
  ownerName: 'Evan Martinez',
  // BUG: Newly created account has null balance instead of 0
  balance: null,
  currency: 'USD',
  createdAt: Date.now() - 1000
}];
const transfers = exports.transfers = [];