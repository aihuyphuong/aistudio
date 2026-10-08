import { useEffect, useRef, useState } from 'react';
import { Empty, StageHeader } from '../../components/ui';
import { aspectValue } from '../../lib/camera';
import { useAssetUrls } from '../../lib/assets';
import { buildTimeline, formatTime } from '../../lib/timeline';
import { useProject } from '../../store/projectStore';

const PX_PER_SECOND = 40;

export function EditStage() {
  const project = useProject((s) => s.project);
  const { clips, total } = buildTimeline(project);
  const urls = useAssetUrls([
    ...clips.flatMap((c) => [c.shot.videoAssetId, c.shot.imageAssetId, c.shot.previzAssetId]),
    ...clips.flatMap((c) => c.lines.map((l) => l.line.audioAssetId)),
  ]);

  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audios = useRef(new Map<string, HTMLAudioElement>());
  const videoRef = useRef<HTMLVideoElement>(null);

  const current = clips.find((c) => time >= c.start && time < c.start + c.duration) ?? clips[clips.length - 1];
  const currentLine = current?.lines.find((l) => time >= l.start && time < l.start + l.duration);
  const color = (characterId: string | null) => project.characters.find((c) => c.id === characterId)?.color ?? '#888';

  // Đồng hồ phát
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      setTime((t) => {
        const next = t + (now - last) / 1000;
        if (next >= total) {
          setPlaying(false);
          return total;
        }
        return next;
      });
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, total]);

  // Đồng bộ audio thoại với đầu phát
  useEffect(() => {
    for (const clip of clips) {
      for (const lc of clip.lines) {
        const id = lc.line.audioAssetId;
        if (!id || !urls[id]) continue;
        let el = audios.current.get(id);
        if (!el) {
          el = new Audio(urls[id]);
          audios.current.set(id, el);
        }
        const inside = time >= lc.start && time < lc.start + lc.duration;
        if (playing && inside && el.paused) {
          el.currentTime = Math.max(0, time - lc.start);
          void el.play();
        } else if ((!playing || !inside) && !el.paused) {
          el.pause();
        }
      }
    }
  });

  // Đồng bộ video của shot hiện tại
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !current) return;
    const local = time - current.start;
    if (Math.abs(v.currentTime - local) > 0.3) v.currentTime = Math.min(local, v.duration || local);
    if (playing && v.paused) void v.play();
    if (!playing && !v.paused) v.pause();
  });

  useEffect(() => () => audios.current.forEach((a) => a.pause()), []);

  if (clips.length === 0) {
    return (
      <div className="stage">
        <StageHeader step={9} title="Dựng phim" subtitle="Cần có shot ở bước Phân cảnh." />
        <Empty>Timeline trống.</Empty>
      </div>
    );
  }

  const seek = (t: number) => {
    audios.current.forEach((a) => a.pause());
    setTime(Math.max(0, Math.min(total, t)));
  };

  const shotVideo = current?.shot.videoAssetId && urls[current.shot.videoAssetId];
  const shotImage =
    (current?.shot.imageAssetId && urls[current.shot.imageAssetId]) ||
    (current?.shot.previzAssetId && urls[current.shot.previzAssetId]);

  return (
    <div className="stage">
      <StageHeader
        step={9}
        title="Dựng phim"
        subtitle="Animatic tự động: clip AI nếu có, nếu không dùng keyframe hoặc ảnh previz, kèm lồng tiếng và phụ đề."
      />
      <div className="player" style={{ aspectRatio: aspectValue(project.development.aspectRatio) }}>
        {shotVideo ? (
          <video key={shotVideo} ref={videoRef} src={shotVideo} muted playsInline />
        ) : shotImage ? (
          <img src={shotImage} alt="" />
        ) : (
          <div className="player-card">
            <div className="muted">{current.scene.title} · {current.shot.size}</div>
            <div>{current.shot.description || 'Chưa có hình ảnh'}</div>
          </div>
        )}
        {currentLine && <div className="subtitle">{currentLine.line.text}</div>}
      </div>
      <div className="transport">
        <button className="primary" onClick={() => (time >= total ? (seek(0), setPlaying(true)) : setPlaying(!playing))}>
          {playing ? '⏸' : '▶'}
        </button>
        <button onClick={() => seek(0)}>⏮</button>
        <span className="mono">{formatTime(time)} / {formatTime(total)}</span>
        <span className="muted small">Mục tiêu {project.development.targetDuration}s</span>
      </div>

      <div className="timeline" onClick={(e) => {
        const rect = (e.currentTarget.firstElementChild as HTMLElement).getBoundingClientRect();
        seek((e.clientX - rect.left) / PX_PER_SECOND);
      }}>
        <div className="timeline-inner" style={{ width: total * PX_PER_SECOND + 40 }}>
          <div className="track">
            {clips.map((c, i) => (
              <div
                key={c.shot.id}
                className={`clip video ${c === current ? 'current' : ''}`}
                style={{ left: c.start * PX_PER_SECOND, width: c.duration * PX_PER_SECOND }}
                title={c.shot.description}
              >
                {(c.shot.imageAssetId ?? c.shot.previzAssetId) && urls[(c.shot.imageAssetId ?? c.shot.previzAssetId)!] && (
                  <img src={urls[(c.shot.imageAssetId ?? c.shot.previzAssetId)!]} alt="" />
                )}
                <span>#{i + 1} {c.shot.size}{c.shot.videoAssetId ? ' 🎞️' : ''}</span>
              </div>
            ))}
          </div>
          <div className="track">
            {clips.flatMap((c) =>
              c.lines.map((l) => (
                <div
                  key={`${c.shot.id}-${l.line.id}`}
                  className={`clip audio ${l.line.audioAssetId ? '' : 'missing'}`}
                  style={{ left: l.start * PX_PER_SECOND, width: l.duration * PX_PER_SECOND, background: color(l.line.characterId) }}
                  title={l.line.text}
                >
                  <span>{l.line.text}</span>
                </div>
              )),
            )}
          </div>
          <div className="playhead" style={{ left: time * PX_PER_SECOND }} />
        </div>
      </div>
      <p className="muted small">Khối thoại gạch chéo là chưa lồng tiếng (thời lượng đang ước tính). Bấm vào timeline để tua.</p>
    </div>
  );
}
