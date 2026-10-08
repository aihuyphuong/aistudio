import type { VoiceProviderId } from '../../types';
import { elevenLabsProvider } from './elevenlabs';
import type { VoiceProvider } from './types';
import { voiceStudioProvider } from './voicestudio';

export const voiceProviders: Record<VoiceProviderId, VoiceProvider> = {
  elevenlabs: elevenLabsProvider,
  voicestudio: voiceStudioProvider,
};

export type { Voice, VoiceProvider } from './types';
