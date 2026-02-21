const BASE_URL = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export interface Account {
  id: string;
  ownerId: string;
  ownerName: string;
  balance: number;
  currency: string;
  createdAt: number;
}

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: number;
}

export function getAccounts(): Promise<{ accounts: Account[] }> {
  return request('/accounts');
}

export function getAccount(id: string): Promise<{ account: Account }> {
  return request(`/accounts/${id}`);
}

export function createTransfer(data: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description: string;
}): Promise<{ transfer: Transfer }> {
  return request('/transfers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getTransfers(accountId?: string): Promise<{ transfers: Transfer[] }> {
  const query = accountId ? `?accountId=${accountId}` : '';
  return request(`/transfers${query}`);
}
