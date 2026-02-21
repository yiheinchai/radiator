import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Transfer from './pages/Transfer';
import History from './pages/History';

type Page = 'dashboard' | 'transfer' | 'history';

const headerStyle: React.CSSProperties = {
  backgroundColor: '#1a1a2e',
  padding: '0 24px',
  display: 'flex',
  alignItems: 'center',
  height: '60px',
  gap: '32px',
};

const logoStyle: React.CSSProperties = {
  color: '#fff',
  fontSize: '20px',
  fontWeight: 700,
  letterSpacing: '-0.5px',
};

const navStyle: React.CSSProperties = {
  display: 'flex',
  gap: '4px',
};

const navButtonStyle = (active: boolean): React.CSSProperties => ({
  background: active ? 'rgba(255,255,255,0.15)' : 'none',
  border: 'none',
  color: active ? '#fff' : 'rgba(255,255,255,0.6)',
  padding: '8px 16px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s',
});

const mainStyle: React.CSSProperties = {
  padding: '32px 24px',
};

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');

  return (
    <div>
      <header style={headerStyle}>
        <div style={logoStyle}>Demo Bank</div>
        <nav style={navStyle}>
          <button style={navButtonStyle(page === 'dashboard')} onClick={() => setPage('dashboard')}>
            Accounts
          </button>
          <button style={navButtonStyle(page === 'transfer')} onClick={() => setPage('transfer')}>
            Transfer
          </button>
          <button style={navButtonStyle(page === 'history')} onClick={() => setPage('history')}>
            History
          </button>
        </nav>
      </header>
      <main style={mainStyle}>
        {page === 'dashboard' && <Dashboard />}
        {page === 'transfer' && <Transfer />}
        {page === 'history' && <History />}
      </main>
    </div>
  );
}
