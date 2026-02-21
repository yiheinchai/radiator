"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.calculateFee = calculateFee;
exports.getAllTransfers = getAllTransfers;
exports.getTransfersByAccountId = getTransfersByAccountId;
exports.processTransfer = processTransfer;
exports.validateTransferAmount = validateTransferAmount;
var _client = require("@radiator/client");
var _uuid = require("uuid");
var _db = require("../db.js");
var _accountService = require("./account-service.js");
var _validationService = require("./validation-service.js");
/**
 * BUG #2: Float precision bug
 * This function calculates a fee as 30% of the transfer amount.
 * It splits the calculation into 10% + 20% which does NOT always equal 30%
 * due to IEEE 754 floating point arithmetic.
 */
function calculateFee(amount) {
  try {
    (0, _client.enterFunction)("a715f001d02a3f7a5b2de91a0a77ef2b5fe26157802138d2cdb8f2a3a768b0ff", "calculateFee", "/Users/yihein.chai/Documents/learn/rad/apps/demo-bank/backend/src/services/transfer-service.ts");
    (0, _client.capture)("a715f001d02a3f7a5b2de91a0a77ef2b5fe26157802138d2cdb8f2a3a768b0ff", "amount", amount, {
      line: 0,
      column: 0
    });
    // Intentionally split to trigger float precision issues
    const baseFee = amount * 0.1;
    (0, _client.capture)("a715f001d02a3f7a5b2de91a0a77ef2b5fe26157802138d2cdb8f2a3a768b0ff", "baseFee", baseFee, {
      line: 14,
      column: 2
    });
    const additionalFee = amount * 0.2;
    (0, _client.capture)("a715f001d02a3f7a5b2de91a0a77ef2b5fe26157802138d2cdb8f2a3a768b0ff", "additionalFee", additionalFee, {
      line: 15,
      column: 2
    });
    {
      const __rad_ret = baseFee + additionalFee;
      (0, _client.captureReturn)("a715f001d02a3f7a5b2de91a0a77ef2b5fe26157802138d2cdb8f2a3a768b0ff", __rad_ret);
      return __rad_ret;
    }
  } catch (__rad_err) {
    (0, _client.onError)("a715f001d02a3f7a5b2de91a0a77ef2b5fe26157802138d2cdb8f2a3a768b0ff", __rad_err);
    throw __rad_err;
  } finally {
    (0, _client.exitFunction)("a715f001d02a3f7a5b2de91a0a77ef2b5fe26157802138d2cdb8f2a3a768b0ff");
  }
}

/**
 * BUG #3: Negative zero bug
 * This validation checks if the amount is positive, but -0 passes the check
 * because (-0 >= 0) is true in JavaScript.
 */
function validateTransferAmount(amount) {
  try {
    (0, _client.enterFunction)("45c7b08554b6f8006673cfaeecef911ae4d908fa45ae5168cb34195ea4d83887", "validateTransferAmount", "/Users/yihein.chai/Documents/learn/rad/apps/demo-bank/backend/src/services/transfer-service.ts");
    (0, _client.capture)("45c7b08554b6f8006673cfaeecef911ae4d908fa45ae5168cb34195ea4d83887", "amount", amount, {
      line: 0,
      column: 0
    });
    {
      const __rad_ret = amount >= 0;
      (0, _client.captureReturn)("45c7b08554b6f8006673cfaeecef911ae4d908fa45ae5168cb34195ea4d83887", __rad_ret);
      return __rad_ret;
    }
  } catch (__rad_err) {
    (0, _client.onError)("45c7b08554b6f8006673cfaeecef911ae4d908fa45ae5168cb34195ea4d83887", __rad_err);
    throw __rad_err;
  } finally {
    (0, _client.exitFunction)("45c7b08554b6f8006673cfaeecef911ae4d908fa45ae5168cb34195ea4d83887");
  }
}

/**
 * BUG #1: Null balance bug
 * The processTransfer function doesn't check if an account's balance is null.
 */
function processTransfer(fromAccountId, toAccountId, amount, description) {
  try {
    (0, _client.enterFunction)("de9b8c3a755d40af949b0e7e5db9f6fc5a5c09627cb87cc31bc743ac8331ab6e", "processTransfer", "/Users/yihein.chai/Documents/learn/rad/apps/demo-bank/backend/src/services/transfer-service.ts");
    (0, _client.capture)("de9b8c3a755d40af949b0e7e5db9f6fc5a5c09627cb87cc31bc743ac8331ab6e", "fromAccountId", fromAccountId, {
      line: 0,
      column: 0
    });
    (0, _client.capture)("de9b8c3a755d40af949b0e7e5db9f6fc5a5c09627cb87cc31bc743ac8331ab6e", "toAccountId", toAccountId, {
      line: 0,
      column: 0
    });
    (0, _client.capture)("de9b8c3a755d40af949b0e7e5db9f6fc5a5c09627cb87cc31bc743ac8331ab6e", "amount", amount, {
      line: 0,
      column: 0
    });
    (0, _client.capture)("de9b8c3a755d40af949b0e7e5db9f6fc5a5c09627cb87cc31bc743ac8331ab6e", "description", description, {
      line: 0,
      column: 0
    });
    const transfer = {
      id: `txn-${(0, _uuid.v4)().slice(0, 8)}`,
      fromAccountId,
      toAccountId,
      amount,
      description,
      status: 'pending',
      createdAt: Date.now()
    };

    // Validate business hours (BUG #4: timezone issues)
    (0, _client.capture)("de9b8c3a755d40af949b0e7e5db9f6fc5a5c09627cb87cc31bc743ac8331ab6e", "transfer", transfer, {
      line: 35,
      column: 2
    });
    if (!(0, _validationService.isBusinessHours)()) {
      transfer.status = 'failed';
      _db.transfers.push(transfer);
      return transfer;
    }

    // Validate amount (BUG #3: negative zero passes)
    if (!validateTransferAmount(amount)) {
      transfer.status = 'failed';
      _db.transfers.push(transfer);
      return transfer;
    }
    const fromAccount = (0, _accountService.getAccountById)(fromAccountId);
    (0, _client.capture)("de9b8c3a755d40af949b0e7e5db9f6fc5a5c09627cb87cc31bc743ac8331ab6e", "fromAccount", fromAccount, {
      line: 59,
      column: 2
    });
    const toAccount = (0, _accountService.getAccountById)(toAccountId);
    (0, _client.capture)("de9b8c3a755d40af949b0e7e5db9f6fc5a5c09627cb87cc31bc743ac8331ab6e", "toAccount", toAccount, {
      line: 60,
      column: 2
    });
    if (!fromAccount || !toAccount) {
      transfer.status = 'failed';
      _db.transfers.push(transfer);
      return transfer;
    }

    // Check sufficient funds - BUG #1: if fromAccount.balance is null,
    // (null >= amount) is false for positive amounts, but null >= 0 is true.
    if (fromAccount.balance < amount) {
      transfer.status = 'failed';
      _db.transfers.push(transfer);
      return transfer;
    }

    // Calculate fee (BUG #2: float precision)
    const fee = calculateFee(amount);

    // BUG #1: If toAccount.balance is null, this produces NaN
    (0, _client.capture)("de9b8c3a755d40af949b0e7e5db9f6fc5a5c09627cb87cc31bc743ac8331ab6e", "fee", fee, {
      line: 77,
      column: 2
    });
    const newFromBalance = fromAccount.balance - amount - fee;
    (0, _client.capture)("de9b8c3a755d40af949b0e7e5db9f6fc5a5c09627cb87cc31bc743ac8331ab6e", "newFromBalance", newFromBalance, {
      line: 80,
      column: 2
    });
    const newToBalance = toAccount.balance + amount;

    // No null check on the result - NaN propagates silently
    (0, _client.capture)("de9b8c3a755d40af949b0e7e5db9f6fc5a5c09627cb87cc31bc743ac8331ab6e", "newToBalance", newToBalance, {
      line: 81,
      column: 2
    });
    (0, _accountService.updateAccountBalance)(fromAccountId, newFromBalance);
    (0, _accountService.updateAccountBalance)(toAccountId, newToBalance);
    transfer.status = 'completed';
    _db.transfers.push(transfer);
    {
      const __rad_ret = transfer;
      (0, _client.captureReturn)("de9b8c3a755d40af949b0e7e5db9f6fc5a5c09627cb87cc31bc743ac8331ab6e", __rad_ret);
      return __rad_ret;
    }
  } catch (__rad_err) {
    (0, _client.onError)("de9b8c3a755d40af949b0e7e5db9f6fc5a5c09627cb87cc31bc743ac8331ab6e", __rad_err);
    throw __rad_err;
  } finally {
    (0, _client.exitFunction)("de9b8c3a755d40af949b0e7e5db9f6fc5a5c09627cb87cc31bc743ac8331ab6e");
  }
}
function getAllTransfers() {
  try {
    (0, _client.enterFunction)("3d37b885bd26fbe651f885c01e16b82806514560d9ecc7689b9a4bb460cc761d", "getAllTransfers", "/Users/yihein.chai/Documents/learn/rad/apps/demo-bank/backend/src/services/transfer-service.ts");
    {
      const __rad_ret = _db.transfers;
      (0, _client.captureReturn)("3d37b885bd26fbe651f885c01e16b82806514560d9ecc7689b9a4bb460cc761d", __rad_ret);
      return __rad_ret;
    }
  } catch (__rad_err) {
    (0, _client.onError)("3d37b885bd26fbe651f885c01e16b82806514560d9ecc7689b9a4bb460cc761d", __rad_err);
    throw __rad_err;
  } finally {
    (0, _client.exitFunction)("3d37b885bd26fbe651f885c01e16b82806514560d9ecc7689b9a4bb460cc761d");
  }
}
function getTransfersByAccountId(accountId) {
  try {
    (0, _client.enterFunction)("dcc1445f7a702db15149b920c49a98f36f099c76c2318d04ec2dbb8b86ad1f87", "getTransfersByAccountId", "/Users/yihein.chai/Documents/learn/rad/apps/demo-bank/backend/src/services/transfer-service.ts");
    (0, _client.capture)("dcc1445f7a702db15149b920c49a98f36f099c76c2318d04ec2dbb8b86ad1f87", "accountId", accountId, {
      line: 0,
      column: 0
    });
    {
      const __rad_ret = _db.transfers.filter(t => {
        try {
          (0, _client.enterFunction)("89e838b80ddbf27710175013bd923b87a6c7764c34b304bd8d967434e980470f", "anonymous", "/Users/yihein.chai/Documents/learn/rad/apps/demo-bank/backend/src/services/transfer-service.ts");
          (0, _client.capture)("89e838b80ddbf27710175013bd923b87a6c7764c34b304bd8d967434e980470f", "t", t, {
            line: 0,
            column: 0
          });
          {
            const __rad_ret = t.fromAccountId === accountId || t.toAccountId === accountId;
            (0, _client.captureReturn)("89e838b80ddbf27710175013bd923b87a6c7764c34b304bd8d967434e980470f", __rad_ret);
            return __rad_ret;
          }
        } catch (__rad_err) {
          (0, _client.onError)("89e838b80ddbf27710175013bd923b87a6c7764c34b304bd8d967434e980470f", __rad_err);
          throw __rad_err;
        } finally {
          (0, _client.exitFunction)("89e838b80ddbf27710175013bd923b87a6c7764c34b304bd8d967434e980470f");
        }
      });
      (0, _client.captureReturn)("dcc1445f7a702db15149b920c49a98f36f099c76c2318d04ec2dbb8b86ad1f87", __rad_ret);
      return __rad_ret;
    }
  } catch (__rad_err) {
    (0, _client.onError)("dcc1445f7a702db15149b920c49a98f36f099c76c2318d04ec2dbb8b86ad1f87", __rad_err);
    throw __rad_err;
  } finally {
    (0, _client.exitFunction)("dcc1445f7a702db15149b920c49a98f36f099c76c2318d04ec2dbb8b86ad1f87");
  }
}