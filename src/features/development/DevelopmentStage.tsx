import { useState } from 'react';
import { ErrorNote, errorMessage, Field, StageHeader } from '../../components/ui';
import { generateOutline } from '../../providers/llm/claude';
import { useProject } from '../../store/projectStore';
import { useUI } from '../../store/uiStore';
import type { AspectRatio } from '../../types';

const ASPECTS: AspectRatio[] = ['16:9', '2.39:1', '9:16', '1:1'];

export function DevelopmentStage() {
  const dev = useProject((s) => s.project.development);
  const hasContent = useProject((s) => s.project.scenes.length > 0);
  const { setDevelopment, applyOutline, newProject, loadSample } = useProject.getState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runOutline = async () => {
    if (hasContent && !confirm('Dàn ý mới sẽ thay toàn bộ nhân vật, bối cảnh, cảnh và shot hiện có. Tiếp tục?')) return;
    setBusy(true);
    setError(null);
    try {
      const { synopsis, outline } = await generateOutline(useProject.getState().settings, dev);
      setDevelopment({ synopsis });
      applyOutline(outline);
      useUI.getState().setStage('story');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stage">
      <StageHeader
        step={1}
        title="Phát triển ý tưởng"
        subtitle="Như một nhà sản xuất: chốt logline, thể loại, giọng điệu và thời lượng trước khi viết."
        actions={
          <>
            <button className="ghost" onClick={() => confirm('Tạo dự án trống? Dự án hiện tại sẽ bị thay thế.') && newProject()}>
              Dự án trống
            </button>
            <button className="ghost" onClick={() => confirm('Mở dự án mẫu? Dự án hiện tại sẽ bị thay thế.') && loadSample()}>
              Dự án mẫu
            </button>
          </>
        }
      />
      <div className="grid-2">
        <div className="card">
          <Field label="Tên phim">
            <input value={dev.title} onChange={(e) => setDevelopment({ title: e.target.value })} />
          </Field>
          <Field label="Logline" hint="Một câu: ai, muốn gì, trở ngại là gì.">
            <textarea rows={3} value={dev.logline} onChange={(e) => setDevelopment({ logline: e.target.value })} />
          </Field>
          <Field label="Tóm tắt (synopsis)">
            <textarea rows={8} value={dev.synopsis} onChange={(e) => setDevelopment({ synopsis: e.target.value })} />
          </Field>
        </div>
        <div className="card">
          <div className="grid-2 tight">
            <Field label="Thể loại">
              <input value={dev.genre} onChange={(e) => setDevelopment({ genre: e.target.value })} />
            </Field>
            <Field label="Giọng điệu">
              <input value={dev.tone} onChange={(e) => setDevelopment({ tone: e.target.value })} />
            </Field>
            <Field label="Khán giả">
              <input value={dev.audience} onChange={(e) => setDevelopment({ audience: e.target.value })} />
            </Field>
            <Field label="Ngôn ngữ (ISO)">
              <input value={dev.language} onChange={(e) => setDevelopment({ language: e.target.value })} />
            </Field>
            <Field label="Thời lượng mục tiêu (giây)">
              <input
                type="number"
                min={10}
                value={dev.targetDuration}
                onChange={(e) => setDevelopment({ targetDuration: Number(e.target.value) })}
              />
            </Field>
            <Field label="Khung hình">
              <select value={dev.aspectRatio} onChange={(e) => setDevelopment({ aspectRatio: e.target.value as AspectRatio })}>
                {ASPECTS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="ai-box">
            <strong>✨ Biên kịch AI</strong>
            <p className="muted small">
              Claude sẽ viết synopsis, tạo nhân vật, bối cảnh, các cảnh kèm thoại và nối chúng thành đồ thị cốt truyện.
            </p>
            <button className="primary" disabled={busy || !dev.logline} onClick={runOutline}>
              {busy ? 'Đang viết…' : 'Dựng dàn ý từ logline'}
            </button>
            <ErrorNote error={error} />
          </div>
        </div>
      </div>
    </div>
  );
}
