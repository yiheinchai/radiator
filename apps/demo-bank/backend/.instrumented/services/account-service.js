"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createAccount = createAccount;
exports.getAccountById = getAccountById;
exports.getAllAccounts = getAllAccounts;
exports.updateAccountBalance = updateAccountBalance;
var _client = require("@radiator/client");
var _uuid = require("uuid");
var _db = require("../db.js");
function getAllAccounts() {
  try {
    (0, _client.enterFunction)("34e20ef68c2486bf2aaa4c03daf69fd8b72876b1393e37d46b6b306b90611b08", "getAllAccounts", "/Users/yihein.chai/Documents/learn/rad/apps/demo-bank/backend/src/services/account-service.ts");
    {
      const __rad_ret = _db.accounts;
      (0, _client.captureReturn)("34e20ef68c2486bf2aaa4c03daf69fd8b72876b1393e37d46b6b306b90611b08", __rad_ret);
      return __rad_ret;
    }
  } catch (__rad_err) {
    (0, _client.onError)("34e20ef68c2486bf2aaa4c03daf69fd8b72876b1393e37d46b6b306b90611b08", __rad_err);
    throw __rad_err;
  } finally {
    (0, _client.exitFunction)("34e20ef68c2486bf2aaa4c03daf69fd8b72876b1393e37d46b6b306b90611b08");
  }
}
function getAccountById(id) {
  try {
    (0, _client.enterFunction)("4dbe2b097181e2bce45d5f67e08ef4b0f087542e6268bd38d6b3f73515668926", "getAccountById", "/Users/yihein.chai/Documents/learn/rad/apps/demo-bank/backend/src/services/account-service.ts");
    (0, _client.capture)("4dbe2b097181e2bce45d5f67e08ef4b0f087542e6268bd38d6b3f73515668926", "id", id, {
      line: 0,
      column: 0
    });
    {
      const __rad_ret = _db.accounts.find(acc => {
        try {
          (0, _client.enterFunction)("96f8325a884d818ecf4528a4d1bf7672d03c03ee37a68d1289c2f51fe485cb55", "anonymous", "/Users/yihein.chai/Documents/learn/rad/apps/demo-bank/backend/src/services/account-service.ts");
          (0, _client.capture)("96f8325a884d818ecf4528a4d1bf7672d03c03ee37a68d1289c2f51fe485cb55", "acc", acc, {
            line: 0,
            column: 0
          });
          {
            const __rad_ret = acc.id === id;
            (0, _client.captureReturn)("96f8325a884d818ecf4528a4d1bf7672d03c03ee37a68d1289c2f51fe485cb55", __rad_ret);
            return __rad_ret;
          }
        } catch (__rad_err) {
          (0, _client.onError)("96f8325a884d818ecf4528a4d1bf7672d03c03ee37a68d1289c2f51fe485cb55", __rad_err);
          throw __rad_err;
        } finally {
          (0, _client.exitFunction)("96f8325a884d818ecf4528a4d1bf7672d03c03ee37a68d1289c2f51fe485cb55");
        }
      });
      (0, _client.captureReturn)("4dbe2b097181e2bce45d5f67e08ef4b0f087542e6268bd38d6b3f73515668926", __rad_ret);
      return __rad_ret;
    }
  } catch (__rad_err) {
    (0, _client.onError)("4dbe2b097181e2bce45d5f67e08ef4b0f087542e6268bd38d6b3f73515668926", __rad_err);
    throw __rad_err;
  } finally {
    (0, _client.exitFunction)("4dbe2b097181e2bce45d5f67e08ef4b0f087542e6268bd38d6b3f73515668926");
  }
}
function createAccount(ownerId, ownerName, currency = 'USD') {
  try {
    (0, _client.enterFunction)("eb2e4577d04f1148ff6c1504337aa901754dcaafa8b30b3688c354f003905440", "createAccount", "/Users/yihein.chai/Documents/learn/rad/apps/demo-bank/backend/src/services/account-service.ts");
    (0, _client.capture)("eb2e4577d04f1148ff6c1504337aa901754dcaafa8b30b3688c354f003905440", "ownerId", ownerId, {
      line: 0,
      column: 0
    });
    (0, _client.capture)("eb2e4577d04f1148ff6c1504337aa901754dcaafa8b30b3688c354f003905440", "ownerName", ownerName, {
      line: 0,
      column: 0
    });
    (0, _client.capture)("eb2e4577d04f1148ff6c1504337aa901754dcaafa8b30b3688c354f003905440", "currency", currency, {
      line: 0,
      column: 0
    });
    const account = {
      id: `acc-${(0, _uuid.v4)().slice(0, 8)}`,
      ownerId,
      ownerName,
      balance: 0,
      currency,
      createdAt: Date.now()
    };
    (0, _client.capture)("eb2e4577d04f1148ff6c1504337aa901754dcaafa8b30b3688c354f003905440", "account", account, {
      line: 13,
      column: 2
    });
    _db.accounts.push(account);
    {
      const __rad_ret = account;
      (0, _client.captureReturn)("eb2e4577d04f1148ff6c1504337aa901754dcaafa8b30b3688c354f003905440", __rad_ret);
      return __rad_ret;
    }
  } catch (__rad_err) {
    (0, _client.onError)("eb2e4577d04f1148ff6c1504337aa901754dcaafa8b30b3688c354f003905440", __rad_err);
    throw __rad_err;
  } finally {
    (0, _client.exitFunction)("eb2e4577d04f1148ff6c1504337aa901754dcaafa8b30b3688c354f003905440");
  }
}
function updateAccountBalance(id, newBalance) {
  try {
    (0, _client.enterFunction)("24cdb3495201d9152e1b58599dfd4c400c20af44f6258d5f6072e157b34895f5", "updateAccountBalance", "/Users/yihein.chai/Documents/learn/rad/apps/demo-bank/backend/src/services/account-service.ts");
    (0, _client.capture)("24cdb3495201d9152e1b58599dfd4c400c20af44f6258d5f6072e157b34895f5", "id", id, {
      line: 0,
      column: 0
    });
    (0, _client.capture)("24cdb3495201d9152e1b58599dfd4c400c20af44f6258d5f6072e157b34895f5", "newBalance", newBalance, {
      line: 0,
      column: 0
    });
    const account = _db.accounts.find(acc => {
      try {
        (0, _client.enterFunction)("96f8325a884d818ecf4528a4d1bf7672d03c03ee37a68d1289c2f51fe485cb55", "anonymous", "/Users/yihein.chai/Documents/learn/rad/apps/demo-bank/backend/src/services/account-service.ts");
        (0, _client.capture)("96f8325a884d818ecf4528a4d1bf7672d03c03ee37a68d1289c2f51fe485cb55", "acc", acc, {
          line: 0,
          column: 0
        });
        {
          const __rad_ret = acc.id === id;
          (0, _client.captureReturn)("96f8325a884d818ecf4528a4d1bf7672d03c03ee37a68d1289c2f51fe485cb55", __rad_ret);
          return __rad_ret;
        }
      } catch (__rad_err) {
        (0, _client.onError)("96f8325a884d818ecf4528a4d1bf7672d03c03ee37a68d1289c2f51fe485cb55", __rad_err);
        throw __rad_err;
      } finally {
        (0, _client.exitFunction)("96f8325a884d818ecf4528a4d1bf7672d03c03ee37a68d1289c2f51fe485cb55");
      }
    });
    (0, _client.capture)("24cdb3495201d9152e1b58599dfd4c400c20af44f6258d5f6072e157b34895f5", "account", account, {
      line: 26,
      column: 2
    });
    if (account) {
      account.balance = newBalance;
    }
    {
      const __rad_ret = account;
      (0, _client.captureReturn)("24cdb3495201d9152e1b58599dfd4c400c20af44f6258d5f6072e157b34895f5", __rad_ret);
      return __rad_ret;
    }
  } catch (__rad_err) {
    (0, _client.onError)("24cdb3495201d9152e1b58599dfd4c400c20af44f6258d5f6072e157b34895f5", __rad_err);
    throw __rad_err;
  } finally {
    (0, _client.exitFunction)("24cdb3495201d9152e1b58599dfd4c400c20af44f6258d5f6072e157b34895f5");
  }
}