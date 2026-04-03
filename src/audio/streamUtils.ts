undefined
export function onStreamEnded(stream: MediaStream, callback: () => void) {
  const track = stream.getAudioTracks()[0];
  if (track) track.onended = callback;
}
