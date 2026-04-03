export async function getMicrophoneStream(): Promise<MediaStream> {
  return await navigator.mediaDevices.getUserMedia({ audio: true });
}

export async function getSystemAudioStream(): Promise<MediaStream> {
  const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
  if (displayStream.getAudioTracks().length === 0) {
    displayStream.getTracks().forEach(t => t.stop());
    throw new Error('No audio track shared.');
  }
  displayStream.getVideoTracks().forEach(t => t.stop());
  return new MediaStream(displayStream.getAudioTracks());
}
