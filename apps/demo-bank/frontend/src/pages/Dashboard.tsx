import React, { useEffect, useState } from 'react';
import { Account, getAccounts } from '../api/client';
import AccountCard from '../components/AccountCard';

const containerStyle: React.CSSProperties = {
  maxWidth: '900px',
  margin: '0 auto',
};

const headingStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  marginBottom: '24px',
  color: '#1a1a2e',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '16px',
};

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAccounts()
      .then((data) => setAccounts(data.accounts))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={containerStyle}>Loading accounts...</div>;
  if (error) return <div style={containerStyle}>Error: {error}</div>;

  return (
    <div style={containerStyle}>
      <h2 style={headingStyle}>Accounts</h2>
      <div style={gridStyle}>
        {accounts.map((account) => (
          <AccountCard key={account.id} account={account} />
        ))}
      </div>
    </div>
  );
}
