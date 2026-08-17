import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

const GROQ_API_KEY = (import.meta as any).env?.VITE_GROQ_API_KEY || "YOUR_GROQ_API_KEY";

interface HistoryItem {
  id: string;
  text: string;
  timestamp: string;
  type: 'dictation' | 'notes';
}

function App() {
  const [status, setStatus] = useState('Idle');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<'dictation' | 'notes' | 'voice_rag' | null>(null);
  const [ragResult, setRagResult] = useState<{ query: string; passages: string[]; answer: string } | null>(null);
  
  // Persisted state
  const [shortcut, setShortcut] = useState(() => localStorage.getItem('sofi_shortcut') || ' ');
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('sofi_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [showHistory, setShowHistory] = useState(false);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const activeStream = useRef<MediaStream | null>(null);

  // Save to local storage when changed
  useEffect(() => {
    localStorage.setItem('sofi_shortcut', shortcut);
  }, [shortcut]);

  useEffect(() => {
    localStorage.setItem('sofi_history', JSON.stringify(history));
  }, [history]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      handleStop();
    } else {
      startRecording('dictation');
    }
  }, [isRecording]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input box
      if (document.activeElement?.tagName === 'INPUT') return;
      
      // Match the shortcut ignoring case for letters, or checking modifiers
      // Note: for simplicity we just match the key string or code
      if (e.key === shortcut || e.code === shortcut) {
        e.preventDefault();
        toggleRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcut, toggleRecording]);

  const startRecording = async (type: 'dictation' | 'notes' | 'voice_rag') => {
    setStatus(type === 'notes' ? 'Capturing System Audio...' : type === 'voice_rag' ? 'Voice RAG Recording...' : 'Recording...');
    setIsRecording(true);
    setRecordingType(type);
    audioChunks.current = [];
    try {
      let stream: MediaStream;
      
      if (type === 'notes') {
        // Capture system audio (requires video true in browsers, but we just use audio)
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        
        // Ensure the user shared audio
        if (displayStream.getAudioTracks().length === 0) {
          displayStream.getTracks().forEach(t => t.stop());
          throw new Error('No audio track shared. Please check "Share audio" when selecting a tab or window.');
        }
        
        // We only want the audio track to send to the STT API
        stream = new MediaStream(displayStream.getAudioTracks());
        
        // Stop video tracks immediately since we don't need them
        displayStream.getVideoTracks().forEach(t => t.stop());
        
        // If the user stops sharing via browser UI, stop recording
        stream.getAudioTracks()[0].onended = () => {
          handleStop();
        };

      } else {
        // Standard microphone dictation
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      activeStream.current = stream;
      mediaRecorder.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunks.current.push(event.data);
      };
      
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        await processAudio(audioBlob, type);
      };
      
      mediaRecorder.current.start();
    } catch (err: any) {
      console.error(err);
      setStatus(err.message || 'Error Accessing Audio');
      setIsRecording(false);
      setRecordingType(null);
      setTimeout(() => setStatus('Idle'), 4000);
    }
  };

  const handleStop = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      setStatus('Transcribing...');
      setIsRecording(false);
      mediaRecorder.current.stop();
      
      if (activeStream.current) {
        activeStream.current.getTracks().forEach(track => track.stop());
        activeStream.current = null;
      }
    }
  };

  const processAudio = async (blob: Blob, type: 'dictation' | 'notes' | 'voice_rag') => {
    try {
      const formData = new FormData();
      formData.append('file', blob, 'audio.webm');
      formData.append('model', 'whisper-large-v3');
      formData.append('prompt', 'Transcribe the following speech in Hinglish or Hindi.');
      
      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: formData
      });

      const data = await response.json();
      if (data.text && data.text.trim().length > 0) {
        if (type === 'voice_rag') {
          setStatus('Searching MSMARCO & Generating Answer...');
          // Simulate RAG generation or call local endpoint
          const mockAnswer = `[MSMARCO-XI Hindi RAG Answer]\nप्रश्न: ${data.text}\nउत्तर: MSMARCO dataset passages context retrieved successfully for this query.`;
          setRagResult({
            query: data.text,
            passages: ["MSMARCO Hindi Context passage 1...", "MSMARCO Hindi Context passage 2..."],
            answer: mockAnswer
          });
          setStatus('Voice RAG Complete!');
          setTimeout(() => setStatus('Idle'), 3000);
        } else {
          // Add to history
          const newItem: HistoryItem = {
            id: Date.now().toString(),
            text: data.text,
            timestamp: new Date().toLocaleTimeString(),
            type: type
          };
          setHistory(prev => [newItem, ...prev].slice(0, 50));

          setStatus('Copied to Clipboard!');
          try {
            await navigator.clipboard.writeText(data.text);
          } catch (err) {
            console.error("Clipboard copy failed:", err);
          }
          setTimeout(() => setStatus('Idle'), 3000);
        }
      } else {
        setStatus('No speech detected');
        setTimeout(() => setStatus('Idle'), 2000);
      }
    } catch (error) {
      console.error(error);
      setStatus('API Error');
      setTimeout(() => setStatus('Idle'), 2000);
    }
    setRecordingType(null);
  };

  return (
    <div className="app-container">
      {/* TOP RIGHT: Shortcut Config */}
      <div className="top-right-config">
        <label htmlFor="shortcut-input">Shortcut:</label>
        <input 
          id="shortcut-input"
          type="text" 
          value={shortcut} 
          onChange={(e) => setShortcut(e.target.value)}
          maxLength={20}
          title="Click outside after typing to use"
        />
      </div>

      {/* CENTER: Minimalist Dashboard */}
      <div className="center-dashboard">
        <div 
          className={`main-indicator ${isRecording ? 'recording' : 'idle'}`}
          onClick={toggleRecording}
          title="Click to toggle dictation"
        ></div>
        <div className="status-text">{status}</div>
      </div>

      {/* SIDEBAR/MODAL: History */}
      {showHistory && (
        <div className="history-panel">
          <div className="history-header">
            <h3>Recent Dictations</h3>
            <button className="close-btn" onClick={() => setShowHistory(false)}>×</button>
          </div>
          <div className="history-list">
            {history.length === 0 ? (
              <p className="no-history">No recent dictations.</p>
            ) : (
              history.map(item => (
                <div key={item.id} className="history-item">
                  <div className="history-meta">
                    <span className="history-type">{item.type === 'notes' ? '📝 Notes' : '🎤 Dictation'}</span>
                    <span className="history-time">{item.timestamp}</span>
                  </div>
                  <div className="history-text">{item.text}</div>
                  <button className="copy-btn" onClick={() => navigator.clipboard.writeText(item.text)}>Copy</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* BOTTOM ACTION CIRCLES */}
      <div className="action-circles">
        <button 
          className="circle-btn" 
          onClick={() => setShowHistory(!showHistory)}
          title="Check Recent Dictations"
        >
          📜
        </button>
        <button 
          className={`circle-btn ${isRecording && recordingType === 'notes' ? 'recording' : ''}`}
          onClick={() => {
            if (isRecording && recordingType === 'notes') {
              handleStop();
            } else {
              startRecording('notes');
            }
          }}
          title="Take Notes (Capture System Audio)"
        >
          🎧
        </button>
        <button 
          className={`circle-btn ${isRecording && recordingType === 'voice_rag' ? 'recording' : ''}`}
          onClick={() => {
            if (isRecording && recordingType === 'voice_rag') {
              handleStop();
            } else {
              startRecording('voice_rag');
            }
          }}
          title="Voice RAG (Hindi MSMARCO Question Answering)"
        >
          🤖
        </button>
      </div>

      {/* RAG RESULT MODAL */}
      {ragResult && (
        <div className="history-panel" style={{ width: '400px' }}>
          <div className="history-header">
            <h3>🤖 Voice RAG Answer</h3>
            <button className="close-btn" onClick={() => setRagResult(null)}>×</button>
          </div>
          <div style={{ textAlign: 'left', marginTop: '10px' }}>
            <p><strong>Voice Query:</strong> {ragResult.query}</p>
            <hr />
            <p><strong>Answer:</strong></p>
            <div style={{ background: '#1e293b', padding: '10px', borderRadius: '6px' }}>{ragResult.answer}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
