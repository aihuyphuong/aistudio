import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import type { OutlineInput, ShotInput } from '../../store/projectStore';
import type { Character, Development, Location, Scene, Settings } from '../../types';

/**
 * Trợ lý biên kịch / đạo diễn dùng Claude. Ứng dụng chạy hoàn toàn trên máy
 * người dùng nên API key nằm trong trình duyệt (dangerouslyAllowBrowser).
 * Khi triển khai cho nhiều người dùng, chuyển các hàm này ra một backend.
 */
const client = (s: Settings) => {
  if (!s.anthropic.apiKey) throw new Error('Chưa nhập Anthropic API key trong Cài đặt.');
  return new Anthropic({ apiKey: s.anthropic.apiKey, dangerouslyAllowBrowser: true });
};

const OutlineSchema = z.object({
  synopsis: z.string(),
  characters: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      description: z.string(),
      visualPrompt: z.string().describe('English, consistent physical appearance for image models'),
    }),
  ),
  locations: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      visualPrompt: z.string().describe('English, environment description for image models'),
    }),
  ),
  scenes: z.array(
    z.object({
      title: z.string(),
      summary: z.string(),
      location: z.string().describe('Exact name of one of the locations'),
      timeOfDay: z.string(),
      lines: z.array(
        z.object({
          character: z.string().describe('Exact character name, or empty string for the narrator'),
          text: z.string(),
          emotion: z.string(),
        }),
      ),
    }),
  ),
  links: z
    .array(z.object({ from: z.number().int(), to: z.number().int(), label: z.string() }))
    .describe('Story flow between scenes by zero-based index; use labels for branches'),
});

const SHOT_SIZES = ['EWS', 'WS', 'FS', 'MS', 'MCU', 'CU', 'ECU', 'OTS', 'POV'] as const;
const MOVEMENTS = ['static', 'pan', 'tilt', 'dolly-in', 'dolly-out', 'truck', 'crane', 'handheld', 'orbit'] as const;

const ShotListSchema = z.object({
  shots: z.array(
    z.object({
      size: z.enum(SHOT_SIZES),
      movement: z.enum(MOVEMENTS),
      duration: z.number().describe('Seconds'),
      description: z.string().describe('What happens in the shot, in the project language'),
      prompt: z.string().describe('English prompt for a text-to-video model'),
      lineIndexes: z.array(z.number().int()).describe('Zero-based indexes of dialogue lines spoken in this shot'),
    }),
  ),
});

async function run<T>(
  s: Settings,
  system: string,
  user: string,
  format: ReturnType<typeof betaZodOutputFormat<z.ZodType<T>>>,
): Promise<T> {
  const response = await client(s).beta.messages.parse({
    model: s.anthropic.model,
    max_tokens: 16000,
    system,
    messages: [{ role: 'user', content: user }],
    output_config: { effort: 'high', format },
    // Nếu bộ lọc an toàn từ chối, API tự chạy lại trên model dự phòng được khuyến nghị.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  });
  if (response.stop_reason === 'refusal') {
    throw new Error(`Claude từ chối yêu cầu${response.stop_details?.explanation ? `: ${response.stop_details.explanation}` : ''}.`);
  }
  if (response.stop_reason === 'max_tokens') throw new Error('Kết quả quá dài, hãy rút ngắn yêu cầu.');
  if (!response.parsed_output) throw new Error('Claude không trả về dữ liệu hợp lệ.');
  return response.parsed_output;
}

const WRITER_SYSTEM = `You are a professional screenwriter and story editor for short AI-generated films.
Write all human-readable fields (titles, summaries, dialogue, emotions, descriptions) in the project's language.
Write every visualPrompt in English. Keep dialogue speakable and short — every line will be voiced by TTS.
Fit the total runtime: roughly 2.5 spoken words per second plus breathing room for visuals.`;

export async function generateOutline(s: Settings, dev: Development) {
  const result = await run(
    s,
    WRITER_SYSTEM,
    `Develop a complete outline for this film.

Title: ${dev.title}
Logline: ${dev.logline}
Existing synopsis: ${dev.synopsis || '(none)'}
Genre: ${dev.genre}
Tone: ${dev.tone}
Audience: ${dev.audience}
Language: ${dev.language}
Target runtime: ${dev.targetDuration} seconds
Aspect ratio: ${dev.aspectRatio}`,
    betaZodOutputFormat(OutlineSchema),
  );
  const { synopsis, ...outline } = result;
  return { synopsis, outline: outline satisfies OutlineInput };
}

export async function breakdownShots(
  s: Settings,
  dev: Development,
  scene: Scene,
  characters: Character[],
  location: Location | undefined,
): Promise<ShotInput[]> {
  const name = (id: string | null) => characters.find((c) => c.id === id)?.name ?? 'Narrator (voice-over)';
  const lines = scene.lines.map((l, i) => `${i}. ${name(l.characterId)} (${l.emotion}): ${l.text}`).join('\n');
  const cast = characters.map((c) => `- ${c.name}: ${c.visualPrompt}`).join('\n');
  const result = await run(
    s,
    `You are a film director and cinematographer breaking a scene into a shot list.
Use classic coverage (establishing, coverage, reaction, insert) and keep continuity.
Every prompt must be self-contained for a text-to-video model: include the character's visual description,
location, lighting, lens feel and camera move. Assign every dialogue line to exactly one shot.`,
    `Film: ${dev.title} — ${dev.tone}, aspect ratio ${dev.aspectRatio}, language ${dev.language}

Scene: ${scene.title} (${scene.timeOfDay})
Summary: ${scene.summary}
Location: ${location ? `${location.name} — ${location.visualPrompt}` : 'unspecified'}

Cast:
${cast || '(none)'}

Dialogue lines:
${lines || '(no dialogue)'}`,
    betaZodOutputFormat(ShotListSchema),
  );
  return result.shots;
}
