import { Empty, StageHeader } from '../../components/ui';
import { mediaDuration, putAsset, useAssetUrl } from '../../lib/assets';
import { productionPrompt } from '../../lib/prompt';
import { orderScenes } from '../../lib/storyOrder';
import { useProject } from '../../store/projectStore';
import type { Shot } from '../../types';

function Upload({ label, accept, onFile }: { label: string; accept: string; onFile: (f: File) => void }) {
  return (
    <label className="button">
      {label}
      <input hidden type="file" accept={accept} onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
    </label>
  );
}

function ShotRow({ shot, index }: { shot: Shot; index: number }) {
  const project = useProject((s) => s.project);
  const updateShot = useProject((s) => s.updateShot);
  const previz = useAssetUrl(shot.previzAssetId);
  const image = useAssetUrl(shot.imageAssetId);
  const video = useAssetUrl(shot.videoAssetId);
  const prompt = productionPrompt(project, shot);

  return (
    <div className="card gen-row">
      <div className="gen-media">
        <div>
          <div className="muted small">Previz</div>
          {previz ? (
            <a href={previz} download={`shot-${index + 1}-previz.jpg`}><img className="thumb" src={previz} alt="" /></a>
          ) : (
            <div className="thumb placeholder">—</div>
          )}
        </div>
        <div>
          <div className="muted small">Keyframe</div>
          {image ? <img className="thumb" src={image} alt="" /> : <div className="thumb placeholder">—</div>}
        </div>
        <div>
          <div className="muted small">Video</div>
          {video ? <video className="thumb" src={video} controls /> : <div className="thumb placeholder">—</div>}
        </div>
      </div>
      <div className="gen-prompt">
        <div className="row spread">
          <strong>Shot {index + 1} · {shot.size}</strong>
          <span className={`badge status-${shot.status}`}>{shot.status}</span>
        </div>
        <pre>{prompt}</pre>
        <div className="row wrap">
          <button onClick={() => navigator.clipboard.writeText(prompt)}>📋 Sao chép prompt</button>
          <Upload
            label="🖼️ Tải keyframe"
            accept="image/*"
            onFile={async (f) => updateShot(shot.id, { imageAssetId: await putAsset(f) })}
          />
          <Upload
            label="🎞️ Tải clip"
            accept="video/*"
            onFile={async (f) => {
              const duration = await mediaDuration(f).catch(() => shot.duration);
              updateShot(shot.id, { videoAssetId: await putAsset(f), status: 'done', duration: Math.round(duration * 10) / 10 || shot.duration });
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function GenerateStage() {
  const project = useProject((s) => s.project);
  const scenes = orderScenes(project.scenes, project.story);
  let n = 0;
  return (
    <div className="stage">
      <StageHeader
        step={8}
        title="Quay bằng AI"
        subtitle="Mỗi shot có prompt sản xuất đầy đủ (nhân vật, bối cảnh, thông số máy quay) và ảnh previz làm tham chiếu bố cục cho image-to-video."
      />
      <div className="card note">
        Kết nối model sinh video (Veo, Kling, Runway, Wan/LTX-Video qua ComfyUI…) được thiết kế dạng plugin giống phần giọng nói —
        hiện tại bạn có thể sao chép prompt, dùng ảnh previz làm khung tham chiếu, rồi tải keyframe/clip kết quả lên đây.
      </div>
      {project.shots.length === 0 && <Empty>Chưa có shot nào.</Empty>}
      {scenes.map((scene) => {
        const shots = project.shots.filter((s) => s.sceneId === scene.id);
        if (!shots.length) return null;
        return (
          <section key={scene.id}>
            <h2>{scene.title}</h2>
            {shots.map((shot) => (
              <ShotRow key={shot.id} shot={shot} index={n++} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
