import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { useState } from 'react';

import { transcribeAudio } from './api';

async function fileUriToBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error('Could not read the recording.'));
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      // Strip the "data:...;base64," prefix.
      resolve(result.split(',')[1] ?? '');
    };
    reader.readAsDataURL(blob);
  });
}

export interface VoiceInput {
  isRecording: boolean;
  isTranscribing: boolean;
  error: string | null;
  startRecording: () => Promise<void>;
  stopAndTranscribe: () => Promise<string | null>;
}

export function useVoiceInput(): VoiceInput {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startRecording(): Promise<void> {
    setError(null);
    try {
      const permission =
        await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError('Please allow microphone access to use voice input.');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
    } catch {
      setError('Could not start recording. Please try again.');
      setIsRecording(false);
    }
  }

  async function stopAndTranscribe(): Promise<string | null> {
    if (!isRecording) return null;
    setIsRecording(false);
    setIsTranscribing(true);
    setError(null);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error('No recording was captured.');

      const audioBase64 = await fileUriToBase64(uri);
      if (!audioBase64) throw new Error('The recording was empty.');

      const response = await transcribeAudio({
        audioBase64,
        mimeType: 'audio/m4a',
      });
      return response.text;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Transcription failed. Please try again.',
      );
      return null;
    } finally {
      setIsTranscribing(false);
    }
  }

  return {
    isRecording,
    isTranscribing,
    error,
    startRecording,
    stopAndTranscribe,
  };
}
