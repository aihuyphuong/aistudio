import { useState } from 'react';
import { Empty, ErrorNote, errorMessage, Field, StageHeader } from '../../components/ui';
import { useAssetUrl } from '../../lib/assets';
import { orderScenes } from '../../lib/storyOrder';
import { useProject } from '../../store/projectStore';
import type { DialogueLine } from '../../types';
import { synthesizeLine, voiceFor } from './synthesize';
import { VoicePicker } from './VoicePicker';

function LineRow({ sceneId, line }: { sceneId: string; line: DialogueLine }) {
  const characters = useProject((s) => s.project.characters);
  const url = useAssetUrl(line.audioAssetId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const character = characters.find((c) => c.id === line.characterId);
  const voice = voiceFor(line);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      await synthesizeLine(sceneId, line);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="voice-row">
      <div className="voice-who">
        <span className="dot" style={{ background: character?.color ?? '#888' }} />
        <div>
          <strong>{character?.name ?? 'Dẫn chuyện'}</strong>
          <div className="muted small">{voice?.voiceName || voice?.voiceId || 'chưa có giọng'}</div>
        </div>
      </div>
      <div className="voice-text">
        {line.emotion && <span className="muted">({line.emotion}) </span>}
        {line.text}
        <ErrorNote error={error} />
      </div>
      <div className="voice-actions">
        {url && <audio controls src={url} />}
        {line.audioDuration ? <span className="muted small">{line.audioDuration.toFixed(1)}s</span> : null}
        <button onClick={generate} disabled={busy || !line.text}>
          {busy ? '…' : line.audioAssetId ? '↻ Tạo lại' : '🎙️ Tạo'}
        </button>
      </div>
    </div>
  );
}

export function VoiceStage() {
  const project = useProject((s) => s.project);
  const setDevelopment = useProject((s) => s.setDevelopment);
  const scenes = orderScenes(project.scenes, project.story);
  const pending = scenes.flatMap((s) => s.lines.filter((l) => l.text && !l.audioAssetId).map((l) => [s.id, l] as const));
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateAll = async () => {
    setError(null);
    for (const [i, [sceneId, line]] of pending.entries()) {
      setProgress(`${i + 1}/${pending.length}`);
      try {
        await synthesizeLine(sceneId, line);
      } catch (e) {
        setError(errorMessage(e));
        break;
      }
    }
    setProgress(null);
  };

  return (
    <div className="stage">
      <StageHeader
        step={7}
        title="Lồng tiếng"
        subtitle="Mỗi vai dùng giọng đã chọn ở bước Casting. Engine có thể là ElevenLabs hoặc VoiceStudio chạy cục bộ."
        actions={
          <button className="primary" onClick={generateAll} disabled={!!progress || pending.length === 0}>
            {progress ? `Đang tạo ${progress}…` : `Tạo ${pending.length} câu còn thiếu`}
          </button>
        }
      />
      <ErrorNote error={error} />
      <div className="card narrow">
        <Field label="Giọng người dẫn chuyện">
          <VoicePicker value={project.development.narratorVoice} onChange={(narratorVoice) => setDevelopment({ narratorVoice })} />
        </Field>
      </div>
      {scenes.every((s) => s.lines.length === 0) && <Empty>Chưa có câu thoại nào.</Empty>}
      {scenes
        .filter((s) => s.lines.length)
        .map((scene) => (
          <section key={scene.id}>
            <h2>{scene.title}</h2>
            <div className="card flush">
              {scene.lines.map((line) => (
                <LineRow key={line.id} sceneId={scene.id} line={line} />
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}
