import { Empty, StageHeader } from '../../components/ui';
import { orderScenes } from '../../lib/storyOrder';
import { useProject } from '../../store/projectStore';

export function ScriptStage() {
  const project = useProject((s) => s.project);
  const { addScene, updateScene, removeScene, addLine, updateLine, removeLine, moveLine } = useProject.getState();
  const scenes = orderScenes(project.scenes, project.story);
  const words = project.scenes.flatMap((s) => s.lines).reduce((n, l) => n + l.text.split(/\s+/).filter(Boolean).length, 0);

  return (
    <div className="stage">
      <StageHeader
        step={4}
        title="Kịch bản"
        subtitle={`Thứ tự cảnh lấy từ đồ thị cốt truyện. ~${Math.round(words / 2.5)} giây thoại / mục tiêu ${project.development.targetDuration} giây.`}
        actions={<button onClick={() => addScene()}>+ Cảnh</button>}
      />
      {scenes.length === 0 && <Empty>Chưa có cảnh. Thêm cảnh ở đây hoặc trong đồ thị cốt truyện.</Empty>}
      <div className="screenplay">
        {scenes.map((scene, idx) => {
          const location = project.locations.find((l) => l.id === scene.locationId);
          return (
            <article key={scene.id} className="card scene-card">
              <div className="row spread">
                <div className="slugline">
                  CẢNH {idx + 1}. {(location?.name ?? 'CHƯA CÓ BỐI CẢNH').toUpperCase()} — {scene.timeOfDay.toUpperCase()}
                </div>
                <button className="ghost danger" onClick={() => confirm(`Xoá cảnh “${scene.title}” cùng các shot?`) && removeScene(scene.id)}>
                  ✕
                </button>
              </div>
              <input className="strong" value={scene.title} onChange={(e) => updateScene(scene.id, { title: e.target.value })} />
              <textarea
                className="action"
                rows={2}
                placeholder="Mô tả hành động…"
                value={scene.summary}
                onChange={(e) => updateScene(scene.id, { summary: e.target.value })}
              />
              {scene.lines.map((line) => (
                <div className="line" key={line.id}>
                  <div className="line-meta">
                    <select value={line.characterId ?? ''} onChange={(e) => updateLine(scene.id, line.id, { characterId: e.target.value || null })}>
                      <option value="">Người dẫn chuyện</option>
                      {project.characters.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <input
                      placeholder="(cảm xúc)"
                      value={line.emotion}
                      onChange={(e) => updateLine(scene.id, line.id, { emotion: e.target.value })}
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={line.text}
                    onChange={(e) => updateLine(scene.id, line.id, { text: e.target.value, audioAssetId: undefined, audioDuration: undefined })}
                  />
                  <div className="line-actions">
                    <button className="ghost" onClick={() => moveLine(scene.id, line.id, -1)}>↑</button>
                    <button className="ghost" onClick={() => moveLine(scene.id, line.id, 1)}>↓</button>
                    <button className="ghost danger" onClick={() => removeLine(scene.id, line.id)}>✕</button>
                  </div>
                </div>
              ))}
              <button className="ghost" onClick={() => addLine(scene.id, project.characters[0]?.id ?? null)}>+ Thoại</button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
