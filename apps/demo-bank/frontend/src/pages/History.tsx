import React, { useEffect, useState } from 'react';
import { Transfer, getTransfers } from '../api/client';

const containerStyle: React.CSSProperties = {
  maxWidth: '800px',
  margin: '0 auto',
};

const headingStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  marginBottom: '24px',
  color: '#1a1a2e',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  backgroundColor: '#fff',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 16px',
  backgroundColor: '#f8f9fa',
  fontSize: '13px',
  fontWeight: 600,
  color: '#666',
  borderBottom: '1px solid #e8ecf0',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '14px',
  borderBottom: '1px solid #f0f0f0',
};

const statusStyle = (status: string): React.CSSProperties => ({
  display: 'inline-block',
  padding: '4px 10px',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: 600,
  backgroundColor:
    status === 'completed' ? '#d4edda' : status === 'failed' ? '#f8d7da' : '#fff3cd',
  color: status === 'completed' ? '#155724' : status === 'failed' ? '#721c24' : '#856404',
});

const emptyStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '48px',
  color: '#888',
  fontSize: '16px',
};

export default function History() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTransfers()
      .then((data) => setTransfers(data.transfers))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={containerStyle}>Loading transfers...</div>;

  return (
    <div style={containerStyle}>
      <h2 style={headingStyle}>Transaction History</h2>
      {transfers.length === 0 ? (
        <div style={{ ...tableStyle, ...emptyStyle }}>No transactions yet.</div>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>From</th>
              <th style={thStyle}>To</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Date</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((t) => (
              <tr key={t.id}>
                <td style={tdStyle}>{t.id}</td>
                <td style={tdStyle}>{t.fromAccountId}</td>
                <td style={tdStyle}>{t.toAccountId}</td>
                <td style={tdStyle}>${t.amount.toFixed(2)}</td>
                <td style={tdStyle}>{t.description}</td>
                <td style={tdStyle}>
                  <span style={statusStyle(t.status)}>{t.status}</span>
                </td>
                <td style={tdStyle}>{new Date(t.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
