import type { DialogueLine, Project, Scene, Shot } from '../types';
import { orderScenes } from './storyOrder';

export interface LineClip {
  line: DialogueLine;
  start: number;
  duration: number;
}

export interface ShotClip {
  shot: Shot;
  scene: Scene;
  start: number;
  duration: number;
  lines: LineClip[];
}

const LINE_GAP = 0.25;
const ESTIMATE_WPS = 2.5; // từ/giây khi chưa có audio

const lineDuration = (l: DialogueLine) =>
  l.audioDuration ?? Math.max(1, l.text.split(/\s+/).filter(Boolean).length / ESTIMATE_WPS);

/**
 * Dựng timeline tuần tự theo thứ tự câu chuyện. Shot dài ít nhất bằng thời
 * lượng đặt trước, và được kéo dài nếu thoại của nó cần nhiều thời gian hơn.
 */
export function buildTimeline(project: Project): { clips: ShotClip[]; total: number } {
  const clips: ShotClip[] = [];
  let t = 0;
  for (const scene of orderScenes(project.scenes, project.story)) {
    for (const shot of project.shots.filter((s) => s.sceneId === scene.id)) {
      let cursor = t + LINE_GAP;
      const lines = scene.lines
        .filter((l) => shot.lineIds.includes(l.id))
        .map((line) => {
          const clip = { line, start: cursor, duration: lineDuration(line) };
          cursor += clip.duration + LINE_GAP;
          return clip;
        });
      const duration = Math.max(shot.duration, cursor - t);
      clips.push({ shot, scene, start: t, duration, lines });
      t += duration;
    }
  }
  return { clips, total: t };
}

export const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1).padStart(4, '0');
  return `${m}:${sec}`;
};
