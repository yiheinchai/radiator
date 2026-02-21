import React from 'react';
import { Account } from '../api/client';

const cardStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: '12px',
  padding: '20px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  border: '1px solid #e8ecf0',
  transition: 'box-shadow 0.2s',
};

const nameStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#1a1a2e',
  marginBottom: '4px',
};

const idStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#888',
  marginBottom: '16px',
};

const balanceStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 700,
  color: '#2d6a4f',
};

const currencyStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#666',
  marginLeft: '4px',
};

interface AccountCardProps {
  account: Account;
}

export default function AccountCard({ account }: AccountCardProps) {
  const displayBalance =
    account.balance === null || account.balance === undefined
      ? 'N/A'
      : account.balance.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

  return (
    <div style={cardStyle}>
      <div style={nameStyle}>{account.ownerName}</div>
      <div style={idStyle}>{account.id}</div>
      <div>
        <span style={balanceStyle}>
          {displayBalance === 'N/A' ? displayBalance : `$${displayBalance}`}
        </span>
        {displayBalance !== 'N/A' && <span style={currencyStyle}>{account.currency}</span>}
      </div>
    </div>
  );
}
