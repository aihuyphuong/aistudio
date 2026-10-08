import { mediaDuration, putAsset } from '../../lib/assets';
import { voiceProviders } from '../../providers/voice/registry';
import { useProject } from '../../store/projectStore';
import type { DialogueLine } from '../../types';

export function voiceFor(line: DialogueLine) {
  const { project } = useProject.getState();
  return line.characterId
    ? (project.characters.find((c) => c.id === line.characterId)?.voice ?? null)
    : project.development.narratorVoice;
}

/** Tổng hợp một câu thoại, lưu audio vào kho asset và gắn vào câu thoại. */
export async function synthesizeLine(sceneId: string, line: DialogueLine) {
  const { project, settings, updateLine } = useProject.getState();
  const voice = voiceFor(line);
  if (!voice?.voiceId) throw new Error('Chưa chọn giọng cho vai này (bước Casting).');
  const provider = voiceProviders[voice.providerId];
  if (!provider.isConfigured(settings)) throw new Error(`Chưa cấu hình ${provider.label} trong Cài đặt.`);
  const blob = await provider.synthesize(settings, {
    text: line.text,
    voiceId: voice.voiceId,
    emotion: line.emotion || undefined,
    language: project.development.language,
  });
  const audioAssetId = await putAsset(blob);
  const audioDuration = await mediaDuration(blob).catch(() => undefined);
  updateLine(sceneId, line.id, { audioAssetId, audioDuration });
}
