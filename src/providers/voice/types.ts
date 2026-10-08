import type { Settings, VoiceProviderId } from '../../types';

export interface Voice {
  id: string;
  name: string;
  description?: string;
  previewUrl?: string;
}

export interface SynthesisRequest {
  text: string;
  voiceId: string;
  /** Gợi ý cảm xúc/diễn xuất, mỗi engine diễn giải theo cách riêng. */
  emotion?: string;
  language?: string;
}

/**
 * Giao diện chung cho mọi engine lồng tiếng. Thêm engine mới = viết một
 * VoiceProvider và đăng ký trong registry.ts — giao diện người dùng không đổi.
 */
export interface VoiceProvider {
  id: VoiceProviderId;
  label: string;
  isConfigured(settings: Settings): boolean;
  listVoices(settings: Settings): Promise<Voice[]>;
  synthesize(settings: Settings, req: SynthesisRequest): Promise<Blob>;
}

export async function ensureOk(res: Response, provider: string): Promise<Response> {
  if (res.ok) return res;
  let detail = '';
  try {
    detail = await res.text();
  } catch {
    /* bỏ qua */
  }
  throw new Error(`${provider} trả về ${res.status}: ${detail.slice(0, 300)}`);
}
