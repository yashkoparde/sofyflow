export async function getMicrophoneStream(): Promise<MediaStream> {
  return await navigator.mediaDevices.getUserMedia({ audio: true });
}
