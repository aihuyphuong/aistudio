import { lazy, Suspense, type ComponentType } from 'react';
import { CastStage } from './features/cast/CastStage';
import { DevelopmentStage } from './features/development/DevelopmentStage';
import { EditStage } from './features/edit/EditStage';
import { ExportStage } from './features/export/ExportStage';
import { GenerateStage } from './features/generate/GenerateStage';
import { ScriptStage } from './features/script/ScriptStage';
import { SettingsDialog } from './features/settings/SettingsDialog';
import { StoryboardStage } from './features/storyboard/StoryboardStage';
import { StoryStage } from './features/story/StoryStage';
import { VoiceStage } from './features/voice/VoiceStage';
import { STAGES, type StageId } from './stages';
import { useProject } from './store/projectStore';
import { useUI } from './store/uiStore';
import type { Project } from './types';

// three.js khá nặng nên chỉ tải khi mở bước Dàn dựng 3D
const PrevizStage = lazy(() => import('./features/previz/PrevizStage').then((m) => ({ default: m.PrevizStage })));

const VIEWS: Record<StageId, ComponentType> = {
  development: DevelopmentStage,
  story: StoryStage,
  cast: CastStage,
  script: ScriptStage,
  storyboard: StoryboardStage,
  previz: PrevizStage,
  voice: VoiceStage,
  generate: GenerateStage,
  edit: EditStage,
  export: ExportStage,
};

export function App() {
  const { stage, setStage, setSettingsOpen, settingsOpen } = useUI();
  const project = useProject((s) => s.project);
  const title = project.development.title;
  const progress = stageProgress(project);
  const View = VIEWS[stage];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          🎬 <strong>AI Studio</strong>
          <div className="muted small" title={title}>{title}</div>
        </div>
        <nav>
          {STAGES.map((s, i) => (
            <button
              key={s.id}
              className={`nav-item ${stage === s.id ? 'active' : ''}`}
              onClick={() => setStage(s.id)}
              title={s.hint}
            >
              <span className="nav-num">{i + 1}</span>
              <span className="nav-icon">{s.icon}</span>
              <span className="nav-label">
                {s.label}
                <span className="nav-hint">{s.hint}</span>
              </span>
              {progress[s.id] && <span className="nav-done">●</span>}
            </button>
          ))}
        </nav>
        <button className="nav-item settings" onClick={() => setSettingsOpen(true)}>
          <span className="nav-icon">⚙️</span>
          <span className="nav-label">Cài đặt & API key</span>
        </button>
      </aside>
      <main className={`main stage-${stage}`}>
        <Suspense fallback={<div className="stage muted">Đang tải…</div>}>
          <View />
        </Suspense>
      </main>
      {settingsOpen && <SettingsDialog />}
    </div>
  );
}

/** Đánh dấu bước nào đã có dữ liệu, giúp người dùng thấy tiến độ sản xuất. */
function stageProgress(p: Project): Partial<Record<StageId, boolean>> {
  const lines = p.scenes.flatMap((s) => s.lines);
  return {
    development: !!p.development.logline,
    story: p.story.edges.length > 0,
    cast: p.characters.length > 0,
    script: lines.length > 0,
    storyboard: p.shots.length > 0,
    previz: p.shots.some((s) => s.previzAssetId),
    voice: lines.length > 0 && lines.every((l) => l.audioAssetId),
    generate: p.shots.length > 0 && p.shots.every((s) => s.videoAssetId || s.imageAssetId),
  };
}
