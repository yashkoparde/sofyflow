export type RecordingType = 'dictation' | 'notes';
export interface RecordingState {
  isRecording: boolean;
  status: string;
  type: RecordingType | null;
}
