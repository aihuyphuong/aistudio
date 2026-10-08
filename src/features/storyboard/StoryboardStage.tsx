import { useState } from 'react';
import { Empty, ErrorNote, errorMessage, Field, StageHeader } from '../../components/ui';
import { useAssetUrl } from '../../lib/assets';
import { SHOT_SIZES } from '../../lib/camera';
import { orderScenes } from '../../lib/storyOrder';
import { breakdownShots } from '../../providers/llm/claude';
import { shotsOfScene, useProject } from '../../store/projectStore';
import { useUI } from '../../store/uiStore';
import type { CameraMovement, Scene, Shot, ShotSize } from '../../types';

export const MOVEMENTS: Record<CameraMovement, string> = {
  static: 'Tĩnh',
  pan: 'Lia ngang (pan)',
  tilt: 'Lia dọc (tilt)',
  'dolly-in': 'Dolly vào',
  'dolly-out': 'Dolly ra',
  truck: 'Trượt ngang (truck)',
  crane: 'Cẩu (crane)',
  handheld: 'Cầm tay',
  orbit: 'Xoay quanh (orbit)',
};

export function ShotThumb({ shot }: { shot: Shot }) {
  const url = useAssetUrl(shot.imageAssetId ?? shot.previzAssetId);
  return url ? <img className="thumb" src={url} alt="" /> : <div className="thumb placeholder">{shot.size}</div>;
}

function ShotCard({ shot, scene, index }: { shot: Shot; scene: Scene; index: number }) {
  const { updateShot, removeShot, moveShot, toggleShotLine } = useProject.getState();
  const characters = useProject((s) => s.project.characters);
  const name = (id: string | null) => characters.find((c) => c.id === id)?.name ?? 'Dẫn chuyện';

  return (
    <div className="card shot-card">
      <div className="row spread">
        <strong>Shot {index + 1}</strong>
        <div className="row">
          <button className="ghost" onClick={() => moveShot(shot.id, -1)}>←</button>
          <button className="ghost" onClick={() => moveShot(shot.id, 1)}>→</button>
          <button className="ghost danger" onClick={() => removeShot(shot.id)}>✕</button>
        </div>
      </div>
      <button
        className="thumb-button"
        title="Mở trong Dàn dựng 3D"
        onClick={() => {
          useUI.getState().selectShot(shot.id);
          useUI.getState().setStage('previz');
        }}
      >
        <ShotThumb shot={shot} />
      </button>
      <div className="grid-2 tight">
        <Field label="Cỡ cảnh">
          <select value={shot.size} onChange={(e) => updateShot(shot.id, { size: e.target.value as ShotSize })}>
            {Object.entries(SHOT_SIZES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Chuyển động">
          <select value={shot.movement} onChange={(e) => updateShot(shot.id, { movement: e.target.value as CameraMovement })}>
            {Object.entries(MOVEMENTS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Thời lượng (giây)">
        <input type="number" min={1} step={0.5} value={shot.duration} onChange={(e) => updateShot(shot.id, { duration: Number(e.target.value) })} />
      </Field>
      <Field label="Mô tả">
        <textarea rows={2} value={shot.description} onChange={(e) => updateShot(shot.id, { description: e.target.value })} />
      </Field>
      <Field label="Prompt sinh video (EN)">
        <textarea rows={3} value={shot.prompt} onChange={(e) => updateShot(shot.id, { prompt: e.target.value })} />
      </Field>
      {scene.lines.length > 0 && (
        <Field label="Thoại trong shot">
          <div className="checklist">
            {scene.lines.map((l) => (
              <label key={l.id}>
                <input type="checkbox" checked={shot.lineIds.includes(l.id)} onChange={() => toggleShotLine(shot.id, l.id)} />
                <span>
                  <b>{name(l.characterId)}:</b> {l.text}
                </span>
              </label>
            ))}
          </div>
        </Field>
      )}
    </div>
  );
}

function SceneShots({ scene, number }: { scene: Scene; number: number }) {
  const project = useProject((s) => s.project);
  const { addShot, replaceShots } = useProject.getState();
  const shots = shotsOfScene(project, scene.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runBreakdown = async () => {
    if (shots.length && !confirm('Thay các shot hiện tại của cảnh này bằng shot list do AI đề xuất?')) return;
    setBusy(true);
    setError(null);
    try {
      const result = await breakdownShots(
        useProject.getState().settings,
        project.development,
        scene,
        project.characters,
        project.locations.find((l) => l.id === scene.locationId),
      );
      replaceShots(scene.id, result);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const total = shots.reduce((n, s) => n + s.duration, 0);
  return (
    <section className="scene-shots">
      <div className="row spread">
        <h2>
          {number}. {scene.title} <span className="muted small">· {shots.length} shot · {total.toFixed(1)}s</span>
        </h2>
        <div className="row">
          <button onClick={runBreakdown} disabled={busy}>{busy ? 'Đang chia shot…' : '✨ AI chia shot'}</button>
          <button onClick={() => addShot(scene.id)}>+ Shot</button>
        </div>
      </div>
      <ErrorNote error={error} />
      {shots.length === 0 ? (
        <Empty>Chưa có shot.</Empty>
      ) : (
        <div className="shot-strip">
          {shots.map((shot, i) => (
            <ShotCard key={shot.id} shot={shot} scene={scene} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}

export function StoryboardStage() {
  const project = useProject((s) => s.project);
  const scenes = orderScenes(project.scenes, project.story);
  return (
    <div className="stage">
      <StageHeader
        step={5}
        title="Phân cảnh (storyboard)"
        subtitle="Chia mỗi cảnh thành các shot: cỡ cảnh, chuyển động máy, thời lượng, thoại và prompt cho model sinh video."
      />
      {scenes.length === 0 && <Empty>Chưa có cảnh nào.</Empty>}
      {scenes.map((scene, i) => (
        <SceneShots key={scene.id} scene={scene} number={i + 1} />
      ))}
    </div>
  );
}
