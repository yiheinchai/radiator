import { v4 as uuidv4 } from 'uuid';
import { transfers } from '../db.js';
import { getAccountById, updateAccountBalance } from './account-service.js';
import { isBusinessHours } from './validation-service.js';

/**
 * BUG #2: Float precision bug
 * This function calculates a fee as 30% of the transfer amount.
 * It splits the calculation into 10% + 20% which does NOT always equal 30%
 * due to IEEE 754 floating point arithmetic.
 */
export function calculateFee(amount) {
  // Intentionally split to trigger float precision issues
  const baseFee = amount * 0.1;
  const additionalFee = amount * 0.2;
  return baseFee + additionalFee;
}

/**
 * BUG #3: Negative zero bug
 * This validation checks if the amount is positive, but -0 passes the check
 * because (-0 >= 0) is true in JavaScript.
 */
export function validateTransferAmount(amount) {
  // BUG: -0 passes this check ((-0) >= 0 is true)
  // Also allows zero-amount transfers which shouldn't be valid
  return amount >= 0;
}

/**
 * BUG #1: Null balance bug
 * The processTransfer function doesn't check if an account's balance is null.
 */
export function processTransfer(fromAccountId, toAccountId, amount, description) {
  const transfer = {
    id: `txn-${uuidv4().slice(0, 8)}`,
    fromAccountId,
    toAccountId,
    amount,
    description,
    status: 'pending',
    createdAt: Date.now(),
  };

  // Validate business hours (BUG #4: timezone issues)
  if (!isBusinessHours()) {
    transfer.status = 'failed';
    transfers.push(transfer);
    return transfer;
  }

  // Validate amount (BUG #3: negative zero passes)
  if (!validateTransferAmount(amount)) {
    transfer.status = 'failed';
    transfers.push(transfer);
    return transfer;
  }

  const fromAccount = getAccountById(fromAccountId);
  const toAccount = getAccountById(toAccountId);

  if (!fromAccount || !toAccount) {
    transfer.status = 'failed';
    transfers.push(transfer);
    return transfer;
  }

  // Check sufficient funds - BUG #1: if fromAccount.balance is null,
  // (null >= amount) is false for positive amounts, but null >= 0 is true.
  if (fromAccount.balance < amount) {
    transfer.status = 'failed';
    transfers.push(transfer);
    return transfer;
  }

  // Calculate fee (BUG #2: float precision)
  const fee = calculateFee(amount);

  // BUG #1: If toAccount.balance is null, this produces NaN
  const newFromBalance = fromAccount.balance - amount - fee;
  const newToBalance = toAccount.balance + amount;

  // No null check on the result - NaN propagates silently
  updateAccountBalance(fromAccountId, newFromBalance);
  updateAccountBalance(toAccountId, newToBalance);

  transfer.status = 'completed';
  transfers.push(transfer);
  return transfer;
}

export function getAllTransfers() {
  return transfers;
}

export function getTransfersByAccountId(accountId) {
  return transfers.filter(
    (t) => t.fromAccountId === accountId || t.toAccountId === accountId
  );
}
