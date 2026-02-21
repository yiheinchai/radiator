import React, { useEffect, useState } from 'react';
import { Account, getAccounts, createTransfer } from '../api/client';

const containerStyle: React.CSSProperties = {
  maxWidth: '500px',
  margin: '0 auto',
};

const headingStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  marginBottom: '24px',
  color: '#1a1a2e',
};

const formStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: '12px',
  padding: '24px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  border: '1px solid #e8ecf0',
};

const fieldStyle: React.CSSProperties = {
  marginBottom: '16px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: 600,
  marginBottom: '6px',
  color: '#444',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #ddd',
  fontSize: '14px',
  outline: 'none',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  backgroundColor: '#fff',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#2d6a4f',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 600,
  cursor: 'pointer',
  marginTop: '8px',
};

const messageStyle = (isError: boolean): React.CSSProperties => ({
  padding: '12px',
  borderRadius: '8px',
  marginTop: '16px',
  backgroundColor: isError ? '#ffe0e0' : '#d4edda',
  color: isError ? '#c00' : '#155724',
  fontSize: '14px',
});

export default function Transfer() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getAccounts().then((data) => {
      setAccounts(data.accounts);
      if (data.accounts.length >= 2) {
        setFromId(data.accounts[0].id);
        setToId(data.accounts[1].id);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);

    try {
      const result = await createTransfer({
        fromAccountId: fromId,
        toAccountId: toId,
        amount: parseFloat(amount),
        description,
      });
      setMessage({
        text: `Transfer ${result.transfer.status}: $${result.transfer.amount} (ID: ${result.transfer.id})`,
        isError: result.transfer.status === 'failed',
      });
      setAmount('');
      setDescription('');
    } catch (err: any) {
      setMessage({ text: err.message, isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={containerStyle}>
      <h2 style={headingStyle}>New Transfer</h2>
      <form style={formStyle} onSubmit={handleSubmit}>
        <div style={fieldStyle}>
          <label style={labelStyle}>From Account</label>
          <select style={selectStyle} value={fromId} onChange={(e) => setFromId(e.target.value)}>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.ownerName} ({acc.id}) - ${acc.balance ?? 'N/A'}
              </option>
            ))}
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>To Account</label>
          <select style={selectStyle} value={toId} onChange={(e) => setToId(e.target.value)}>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.ownerName} ({acc.id}) - ${acc.balance ?? 'N/A'}
              </option>
            ))}
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Amount ($)</label>
          <input
            style={inputStyle}
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Description</label>
          <input
            style={inputStyle}
            type="text"
            placeholder="Payment for..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <button style={buttonStyle} type="submit" disabled={submitting}>
          {submitting ? 'Processing...' : 'Send Transfer'}
        </button>

        {message && <div style={messageStyle(message.isError)}>{message.text}</div>}
      </form>
    </div>
  );
}
