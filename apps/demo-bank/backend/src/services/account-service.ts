import { v4 as uuidv4 } from 'uuid';
import { accounts } from '../db.js';

export function getAllAccounts() {
  return accounts;
}

export function getAccountById(id) {
  return accounts.find((acc) => acc.id === id);
}

export function createAccount(ownerId, ownerName, currency = 'USD') {
  const account = {
    id: `acc-${uuidv4().slice(0, 8)}`,
    ownerId,
    ownerName,
    balance: 0,
    currency,
    createdAt: Date.now(),
  };
  accounts.push(account);
  return account;
}

export function updateAccountBalance(id, newBalance) {
  const account = accounts.find((acc) => acc.id === id);
  if (account) {
    account.balance = newBalance;
  }
  return account;
}
