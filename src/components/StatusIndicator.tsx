import React from 'react';
interface Props { status: string; }
export const StatusIndicator: React.FC<Props> = ({ status }) => (
  <div className="status-text" style={{ marginTop: '16px', fontSize: '18px', fontWeight: 500 }}>{status}</div>
);
