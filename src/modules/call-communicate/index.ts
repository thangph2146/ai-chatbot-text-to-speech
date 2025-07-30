// Export main component
export { CallCommunicate, type CallState } from './CallCommunicate';
export { default } from './CallCommunicate';

// Export components
export { SoundWave, type SoundWaveType } from './components/SoundWave';

// Export hooks
export { useVoiceRecognition } from './hooks/useVoiceRecognition';
export { useTextToSpeech } from './hooks/useTextToSpeech';

// Export utilities
export {
  processMarkdownText,
  splitTextForTTS,
  cleanTextForSpeech
} from './utils/markdownProcessor';