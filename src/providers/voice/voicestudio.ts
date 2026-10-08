import { ensureOk, type VoiceProvider } from './types';

/**
 * VoiceStudio (github.com/debpalash/VoiceStudio) chạy cục bộ và mở API tương
 * thích OpenAI ở cổng 3900:
 *   GET  /v1/audio/voices  — danh sách giọng (profile clone + alias)
 *   POST /v1/audio/speech  — tổng hợp giọng nói
 * Mặc định gọi qua proxy "/voicestudio" của Vite (xem vite.config.ts).
 */
const headers = (apiKey: string): HeadersInit => ({
  'Content-Type': 'application/json',
  ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
});

const base = (url: string) => url.replace(/\/+$/, '');

interface VSVoice {
  voice_id: string;
  name: string;
  type?: string;
  description?: string;
  language?: string;
}

export const voiceStudioProvider: VoiceProvider = {
  id: 'voicestudio',
  label: 'VoiceStudio (cục bộ)',
  isConfigured: (s) => !!s.voicestudio.baseUrl,

  async listVoices(s) {
    const res = await ensureOk(
      await fetch(`${base(s.voicestudio.baseUrl)}/v1/audio/voices`, { headers: headers(s.voicestudio.apiKey) }),
      'VoiceStudio',
    );
    const json = (await res.json()) as VSVoice[] | { voices?: VSVoice[]; data?: VSVoice[] };
    const list = Array.isArray(json) ? json : (json.voices ?? json.data ?? []);
    // Ưu tiên profile người dùng tự clone/thiết kế, alias OpenAI xếp sau
    return list
      .sort((a, b) => Number(a.type === 'openai_alias') - Number(b.type === 'openai_alias'))
      .map((v) => ({
        id: v.voice_id,
        name: v.name,
        description: v.description ?? [v.type, v.language].filter(Boolean).join(' · '),
      }));
  },

  async synthesize(s, req) {
    const res = await ensureOk(
      await fetch(`${base(s.voicestudio.baseUrl)}/v1/audio/speech`, {
        method: 'POST',
        headers: headers(s.voicestudio.apiKey),
        body: JSON.stringify({
          model: s.voicestudio.model,
          input: req.text,
          voice: req.voiceId,
          response_format: 'mp3',
          ...(req.emotion && { instructions: req.emotion }),
          ...(req.language && { language: req.language }),
        }),
      }),
      'VoiceStudio',
    );
    return res.blob();
  },
};
