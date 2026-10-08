import type { Project, Shot } from '../types';
import { SHOT_SIZES } from './camera';

const MOVES: Record<Shot['movement'], string> = {
  static: 'locked-off static camera',
  pan: 'slow pan',
  tilt: 'slow tilt',
  'dolly-in': 'slow dolly in',
  'dolly-out': 'slow dolly out',
  truck: 'lateral tracking shot',
  crane: 'crane move',
  handheld: 'subtle handheld camera',
  orbit: 'orbiting camera',
};

/**
 * Ghép prompt hoàn chỉnh cho model text/image-to-video: nội dung shot +
 * mô tả nhân vật/bối cảnh nhất quán + thông số máy quay từ bước previz.
 */
export function productionPrompt(project: Project, shot: Shot): string {
  const scene = project.scenes.find((s) => s.id === shot.sceneId);
  const location = project.locations.find((l) => l.id === scene?.locationId);
  const cast = shot.blocking
    .map((b) => project.characters.find((c) => c.id === b.characterId))
    .filter((c) => !!c)
    .map((c) => `${c.name}: ${c.visualPrompt}`);
  const size = SHOT_SIZES[shot.size].match(/\((.+)\)/)?.[1] ?? shot.size;
  return [
    shot.prompt || shot.description,
    cast.length ? `Characters — ${cast.join('; ')}.` : '',
    location ? `Setting — ${location.visualPrompt}, ${scene?.timeOfDay}.` : '',
    `Camera — ${size} shot, ${shot.camera.focalLength}mm lens, ${MOVES[shot.movement]}, camera height ${shot.camera.position[1]}m.`,
    `Style — ${project.development.tone}. Cinematic, aspect ratio ${project.development.aspectRatio}, ${shot.duration}s.`,
  ]
    .filter(Boolean)
    .join('\n');
}
