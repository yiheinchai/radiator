"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _client = require("@radiator/client");
var _express = _interopRequireDefault(require("express"));
var _cors = _interopRequireDefault(require("cors"));
var _accounts = _interopRequireDefault(require("./routes/accounts.js"));
var _transfers = _interopRequireDefault(require("./routes/transfers.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const app = (0, _express.default)();
const PORT = 3200;

// Middleware
app.use((0, _cors.default)());
app.use(_express.default.json());

// Routes
app.use('/api/accounts', _accounts.default);
app.use('/api/transfers', _transfers.default);

// Health check
app.get('/api/health', (_req, res) => {
  try {
    (0, _client.enterFunction)("890cec6f0801a78bf5e97382ace8945039fdc264986dfa40b6216b1d0963e1fa", "anonymous", "/Users/yihein.chai/Documents/learn/rad/apps/demo-bank/backend/src/index.ts");
    (0, _client.capture)("890cec6f0801a78bf5e97382ace8945039fdc264986dfa40b6216b1d0963e1fa", "_req", _req, {
      line: 0,
      column: 0
    });
    (0, _client.capture)("890cec6f0801a78bf5e97382ace8945039fdc264986dfa40b6216b1d0963e1fa", "res", res, {
      line: 0,
      column: 0
    });
    res.json({
      status: 'ok',
      timestamp: Date.now()
    });
  } catch (__rad_err) {
    (0, _client.onError)("890cec6f0801a78bf5e97382ace8945039fdc264986dfa40b6216b1d0963e1fa", __rad_err);
    throw __rad_err;
  } finally {
    (0, _client.exitFunction)("890cec6f0801a78bf5e97382ace8945039fdc264986dfa40b6216b1d0963e1fa");
  }
});

// Start server
app.listen(PORT, () => {
  try {
    (0, _client.enterFunction)("e8bbc3e5601b9c3aff717289cc023e02af41c186ecd8dd778e6c82738b4e5bd5", "anonymous", "/Users/yihein.chai/Documents/learn/rad/apps/demo-bank/backend/src/index.ts");
    console.log(`Demo Bank API running on http://localhost:${PORT}`);
  } catch (__rad_err) {
    (0, _client.onError)("e8bbc3e5601b9c3aff717289cc023e02af41c186ecd8dd778e6c82738b4e5bd5", __rad_err);
    throw __rad_err;
  } finally {
    (0, _client.exitFunction)("e8bbc3e5601b9c3aff717289cc023e02af41c186ecd8dd778e6c82738b4e5bd5");
  }
});
var _default = exports.default = app;