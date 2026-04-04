import { GROQ_API_KEY, GROQ_API_URL } from '../config/constants';

export async function sendAudioToGroq(blob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('file', blob, 'audio.webm');
  formData.append('model', 'whisper-large-v3');
  formData.append('prompt', 'Transcribe speech in Hinglish (Hindi + English).');
  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body: formData
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  const data = await res.json();
  if (!data.text) throw new Error('Empty response from API');
  return data.text;
}
