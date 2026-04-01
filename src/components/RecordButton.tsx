import React from 'react';
interface Props { isRecording: boolean; onToggle: () => void; }
export const RecordButton: React.FC<Props> = ({ isRecording, onToggle }) => (
  <div className={`main-indicator ${isRecording ? 'recording' : 'idle'}`} onClick={onToggle} title="Click to toggle dictation" />
);
