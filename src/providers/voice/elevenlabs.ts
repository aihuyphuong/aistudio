import { ensureOk, type VoiceProvider } from './types';

const BASE = 'https://api.elevenlabs.io/v1';

export const ELEVENLABS_MODELS = [
  { id: 'eleven_v3', label: 'Eleven v3 — biểu cảm nhất, hỗ trợ audio tag, có tiếng Việt' },
  { id: 'eleven_flash_v2_5', label: 'Flash v2.5 — độ trễ thấp, có tiếng Việt' },
  { id: 'eleven_multilingual_v2', label: 'Multilingual v2 — ổn định (không có tiếng Việt)' },
];

interface ElevenVoice {
  voice_id: string;
  name: string;
  labels?: Record<string, string>;
  preview_url?: string;
}

export const elevenLabsProvider: VoiceProvider = {
  id: 'elevenlabs',
  label: 'ElevenLabs',
  isConfigured: (s) => !!s.elevenlabs.apiKey,

  async listVoices(s) {
    const res = await ensureOk(
      await fetch(`${BASE}/voices`, { headers: { 'xi-api-key': s.elevenlabs.apiKey } }),
      'ElevenLabs',
    );
    const json = (await res.json()) as { voices: ElevenVoice[] };
    return json.voices.map((v) => ({
      id: v.voice_id,
      name: v.name,
      description: v.labels ? Object.values(v.labels).join(', ') : undefined,
      previewUrl: v.preview_url,
    }));
  },

  async synthesize(s, req) {
    const modelId = s.elevenlabs.modelId;
    // Eleven v3 hiểu audio tag dạng [whispers], [angry]... đặt trước câu thoại.
    const text = modelId === 'eleven_v3' && req.emotion ? `[${req.emotion}] ${req.text}` : req.text;
    const res = await ensureOk(
      await fetch(`${BASE}/text-to-speech/${encodeURIComponent(req.voiceId)}?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: { 'xi-api-key': s.elevenlabs.apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({
          text,
          model_id: modelId,
          // Ép ngôn ngữ chỉ được model Flash/Turbo v2.5 hỗ trợ; model khác tự nhận diện.
          ...(req.language && /_v2_5$/.test(modelId) && { language_code: req.language }),
        }),
      }),
      'ElevenLabs',
    );
    return res.blob();
  },
};
