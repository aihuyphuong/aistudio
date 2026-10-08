import { Canvas } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { Empty, Field, StageHeader } from '../../components/ui';
import { dataUrlToBlob, putAsset } from '../../lib/assets';
import { aspectValue, focalToFov, LENS_PRESETS, SHOT_SIZES } from '../../lib/camera';
import { orderScenes } from '../../lib/storyOrder';
import { useProject } from '../../store/projectStore';
import { useUI } from '../../store/uiStore';
import { ShotThumb } from '../storyboard/StoryboardStage';
import { PrevizScene, type GizmoMode, type PrevizHandle, type Selection, type ViewMode } from './PrevizScene';

export function PrevizStage() {
  const project = useProject((s) => s.project);
  const { updateShot } = useProject.getState();
  const { selectedShotId, selectShot } = useUI();
  const scenes = orderScenes(project.scenes, project.story);
  const orderedShots = scenes.flatMap((sc) => project.shots.filter((s) => s.sceneId === sc.id));
  const shot = orderedShots.find((s) => s.id === selectedShotId) ?? orderedShots[0];

  const [view, setView] = useState<ViewMode>('director');
  const [gizmo, setGizmo] = useState<GizmoMode>('translate');
  const [selection, setSelection] = useState<Selection>(null);
  const sceneRef = useRef<PrevizHandle>(null);

  useEffect(() => setSelection(null), [shot?.id]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return;
      if (e.key === 'Escape') setSelection(null);
      if (e.key === 'w') setGizmo('translate');
      if (e.key === 'e') setGizmo('rotate');
      if (e.key === 'c') setView((v) => (v === 'director' ? 'camera' : 'director'));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!shot) {
    return (
      <div className="stage">
        <StageHeader step={6} title="Dàn dựng 3D" subtitle="Cần có shot trong bước Phân cảnh trước." />
        <Empty>Chưa có shot nào.</Empty>
      </div>
    );
  }

  const scene = project.scenes.find((s) => s.id === shot.sceneId)!;
  const absent = project.characters.filter((c) => !shot.blocking.some((b) => b.characterId === c.id));

  const capture = async () => {
    const dataUrl = sceneRef.current?.snapshot();
    if (!dataUrl) return;
    const id = await putAsset(await dataUrlToBlob(dataUrl));
    updateShot(shot.id, { previzAssetId: id, status: shot.status === 'draft' ? 'previz' : shot.status });
  };

  return (
    <div className="stage stage-fill">
      <StageHeader
        step={6}
        title="Dàn dựng 3D (previz)"
        subtitle="Kéo thả nhân vật, máy quay và điểm ngắm. Phím: W di chuyển · E xoay · C nhìn qua ống kính · Esc bỏ chọn."
      />
      <div className="previz-layout">
        <div className="shot-list">
          {scenes.map((sc) => (
            <div key={sc.id}>
              <div className="shot-list-scene">{sc.title}</div>
              {project.shots
                .filter((s) => s.sceneId === sc.id)
                .map((s, i) => (
                  <button key={s.id} className={`shot-list-item ${s.id === shot.id ? 'active' : ''}`} onClick={() => selectShot(s.id)}>
                    <ShotThumb shot={s} />
                    <span>
                      #{i + 1} {s.size}
                      <span className="muted small"> {s.description.slice(0, 40)}</span>
                    </span>
                  </button>
                ))}
            </div>
          ))}
        </div>

        <div className="viewport-wrap">
          <div className="viewport-toolbar">
            <div className="segmented">
              <button className={view === 'director' ? 'active' : ''} onClick={() => setView('director')}>🎬 Đạo diễn</button>
              <button className={view === 'camera' ? 'active' : ''} onClick={() => setView('camera')}>🎥 Qua ống kính</button>
            </div>
            <div className="segmented">
              <button className={gizmo === 'translate' ? 'active' : ''} onClick={() => setGizmo('translate')}>↔ Di chuyển</button>
              <button className={gizmo === 'rotate' ? 'active' : ''} onClick={() => setGizmo('rotate')}>⟳ Xoay</button>
            </div>
            <button className="primary" onClick={capture}>📸 Chụp khung hình</button>
          </div>
          <div className="viewport" style={{ aspectRatio: aspectValue(project.development.aspectRatio) }}>
            <Canvas shadows gl={{ preserveDrawingBuffer: true }} camera={{ position: [3.5, 3, 5.5], fov: 45 }}>
              <PrevizScene
                ref={sceneRef}
                camera={shot.camera}
                blocking={shot.blocking}
                characters={project.characters}
                view={view}
                gizmo={gizmo}
                selection={selection}
                onSelect={setSelection}
                onCameraChange={(c) => updateShot(shot.id, { camera: { ...shot.camera, ...c } })}
                onBlockingChange={(characterId, position, rotationY) =>
                  updateShot(shot.id, {
                    blocking: shot.blocking.map((b) => (b.characterId === characterId ? { ...b, position, rotationY } : b)),
                  })
                }
              />
            </Canvas>
            {view === 'camera' && (
              <div className="frame-overlay">
                <span>{SHOT_SIZES[shot.size]}</span>
                <span>{shot.camera.focalLength}mm · {project.development.aspectRatio}</span>
              </div>
            )}
          </div>
        </div>

        <div className="inspector">
          <div className="stage-step">{scene.title}</div>
          <p className="small">{shot.description || <span className="muted">Chưa có mô tả shot.</span>}</p>

          <h3>Ống kính</h3>
          <Field label={`Tiêu cự: ${shot.camera.focalLength}mm (FOV ${focalToFov(shot.camera.focalLength).toFixed(0)}°)`}>
            <input
              type="range"
              min={12}
              max={200}
              value={shot.camera.focalLength}
              onChange={(e) => updateShot(shot.id, { camera: { ...shot.camera, focalLength: Number(e.target.value) } })}
            />
          </Field>
          <div className="row wrap">
            {LENS_PRESETS.map((f) => (
              <button
                key={f}
                className={`chip ${shot.camera.focalLength === f ? 'active' : ''}`}
                onClick={() => updateShot(shot.id, { camera: { ...shot.camera, focalLength: f } })}
              >
                {f}
              </button>
            ))}
          </div>
          <Field label="Độ cao máy (m)">
            <input
              type="number"
              step={0.1}
              value={shot.camera.position[1]}
              onChange={(e) =>
                updateShot(shot.id, {
                  camera: { ...shot.camera, position: [shot.camera.position[0], Number(e.target.value), shot.camera.position[2]] },
                })
              }
            />
          </Field>

          <h3>Diễn viên trong khung</h3>
          {shot.blocking.map((b) => {
            const c = project.characters.find((x) => x.id === b.characterId);
            if (!c) return null;
            const active = selection?.type === 'character' && selection.id === c.id;
            return (
              <div key={c.id} className={`row actor ${active ? 'active' : ''}`}>
                <span className="dot" style={{ background: c.color }} />
                <button className="ghost grow left" onClick={() => (setView('director'), setSelection({ type: 'character', id: c.id }))}>{c.name}</button>
                <button
                  className="ghost danger"
                  title="Đưa ra khỏi khung"
                  onClick={() => updateShot(shot.id, { blocking: shot.blocking.filter((x) => x.characterId !== c.id) })}
                >
                  ✕
                </button>
              </div>
            );
          })}
          {absent.length > 0 && (
            <select
              value=""
              onChange={(e) =>
                e.target.value &&
                updateShot(shot.id, {
                  blocking: [...shot.blocking, { characterId: e.target.value, position: [0, 0, 1], rotationY: 0 }],
                })
              }
            >
              <option value="">+ Thêm nhân vật vào khung…</option>
              {absent.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <div className="row wrap" style={{ marginTop: 12 }}>
            <button className="ghost" onClick={() => (setView('director'), setSelection({ type: 'camera' }))}>Chọn máy quay</button>
            <button className="ghost" onClick={() => (setView('director'), setSelection({ type: 'target' }))}>Chọn điểm ngắm</button>
          </div>
        </div>
      </div>
    </div>
  );
}
