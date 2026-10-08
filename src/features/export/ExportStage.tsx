import { StageHeader } from '../../components/ui';
import { SHOT_SIZES } from '../../lib/camera';
import { productionPrompt } from '../../lib/prompt';
import { orderScenes } from '../../lib/storyOrder';
import { buildTimeline, formatTime } from '../../lib/timeline';
import { useProject } from '../../store/projectStore';
import type { Project } from '../../types';

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').replace(/[^a-z0-9]+/gi, '-').toLowerCase();

/** Kịch bản định dạng Fountain (chuẩn văn bản thuần của ngành biên kịch). */
function toFountain(p: Project): string {
  const out = [`Title: ${p.development.title}`, `Credit: Viết bởi AI Studio`, '', ''];
  orderScenes(p.scenes, p.story).forEach((scene) => {
    const loc = p.locations.find((l) => l.id === scene.locationId)?.name ?? 'KHÔNG RÕ';
    out.push(`.${loc.toUpperCase()} - ${scene.timeOfDay.toUpperCase()}`, '', scene.summary, '');
    for (const line of scene.lines) {
      const who = p.characters.find((c) => c.id === line.characterId)?.name ?? 'NGƯỜI DẪN CHUYỆN';
      out.push(`@${who.toUpperCase()}${line.characterId ? '' : ' (V.O.)'}`);
      if (line.emotion) out.push(`(${line.emotion})`);
      out.push(line.text, '');
    }
  });
  return out.join('\n');
}

function toCsv(p: Project): string {
  const { clips } = buildTimeline(p);
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [['#', 'Cảnh', 'Bắt đầu', 'Thời lượng', 'Cỡ cảnh', 'Chuyển động', 'Tiêu cự', 'Mô tả', 'Prompt']];
  clips.forEach((c, i) =>
    rows.push([
      String(i + 1),
      c.scene.title,
      formatTime(c.start),
      c.duration.toFixed(1),
      SHOT_SIZES[c.shot.size],
      c.shot.movement,
      `${c.shot.camera.focalLength}mm`,
      c.shot.description,
      productionPrompt(p, c.shot),
    ]),
  );
  return '﻿' + rows.map((r) => r.map(esc).join(',')).join('\n');
}

export function ExportStage() {
  const project = useProject((s) => s.project);
  const loadProject = useProject((s) => s.loadProject);
  const name = slug(project.development.title) || 'project';

  const importJson = async (file: File) => {
    try {
      const p = JSON.parse(await file.text()) as Project;
      if (p.schemaVersion !== 1 || !Array.isArray(p.scenes)) throw new Error('File không phải dự án AI Studio.');
      if (confirm(`Mở “${p.development.title}”? Dự án hiện tại sẽ bị thay thế.`)) loadProject(p);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="stage">
      <StageHeader step={10} title="Xuất bản" subtitle="Xuất các tài liệu sản xuất và lưu/mở lại dự án." />
      <div className="cards">
        <div className="card">
          <h3>📜 Kịch bản (.fountain)</h3>
          <p className="muted small">Mở được bằng Highland, Fade In, Final Draft (import) hoặc WriterSolo.</p>
          <button onClick={() => download(`${name}.fountain`, toFountain(project), 'text/plain')}>Tải kịch bản</button>
        </div>
        <div className="card">
          <h3>🎞️ Shot list (.csv)</h3>
          <p className="muted small">Bảng phân cảnh với timecode, thông số máy quay và prompt sản xuất.</p>
          <button onClick={() => download(`${name}-shotlist.csv`, toCsv(project), 'text/csv')}>Tải shot list</button>
        </div>
        <div className="card">
          <h3>💾 Dự án (.json)</h3>
          <p className="muted small">
            Toàn bộ dữ liệu dự án. Audio, ảnh và video được lưu riêng trong trình duyệt (IndexedDB) và không nằm trong file này.
          </p>
          <div className="row wrap">
            <button onClick={() => download(`${name}.aistudio.json`, JSON.stringify(project, null, 2), 'application/json')}>Lưu dự án</button>
            <label className="button">
              Mở dự án…
              <input hidden type="file" accept=".json,application/json" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
