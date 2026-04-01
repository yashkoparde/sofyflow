import React from 'react';
export interface Item { id: string; text: string; timestamp: string; type: 'dictation' | 'notes'; }
interface Props { item: Item; onCopy: (text: string) => void; }
export const HistoryItem: React.FC<Props> = ({ item, onCopy }) => (
  <div className="history-item">
    <div className="history-meta">
      <span>{item.type === 'notes' ? '📝 Notes' : '🎤 Dictation'}</span>
      <span>{item.timestamp}</span>
    </div>
    <div className="history-text">{item.text}</div>
    <button onClick={() => onCopy(item.text)}>Copy</button>
  </div>
);
