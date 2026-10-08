import type { AspectRatio, ShotSize } from '../types';

const SENSOR_HEIGHT_MM = 24; // full-frame 36x24

/** Tiêu cự (mm) → góc nhìn dọc (độ) cho PerspectiveCamera của three.js. */
export const focalToFov = (focalLength: number) =>
  (2 * Math.atan(SENSOR_HEIGHT_MM / (2 * focalLength)) * 180) / Math.PI;

export const aspectValue = (ratio: AspectRatio) => {
  const [w, h] = ratio.split(':').map(Number);
  return w / h;
};

export const SHOT_SIZES: Record<ShotSize, string> = {
  EWS: 'Toàn cảnh rộng (EWS)',
  WS: 'Toàn cảnh (WS)',
  FS: 'Toàn thân (FS)',
  MS: 'Trung cảnh (MS)',
  MCU: 'Cận trung (MCU)',
  CU: 'Cận cảnh (CU)',
  ECU: 'Đặc tả (ECU)',
  OTS: 'Qua vai (OTS)',
  POV: 'Góc nhìn nhân vật (POV)',
};

export const LENS_PRESETS = [14, 24, 35, 50, 85, 135];

/** Khoảng cách máy quay & tiêu cự gợi ý theo cỡ cảnh, dùng khi tạo shot mới. */
export const SHOT_SIZE_DEFAULTS: Record<ShotSize, { distance: number; focal: number }> = {
  EWS: { distance: 14, focal: 18 },
  WS: { distance: 9, focal: 24 },
  FS: { distance: 6, focal: 35 },
  MS: { distance: 3.5, focal: 50 },
  MCU: { distance: 2.5, focal: 50 },
  CU: { distance: 1.6, focal: 85 },
  ECU: { distance: 0.9, focal: 135 },
  OTS: { distance: 2.5, focal: 50 },
  POV: { distance: 0.3, focal: 35 },
};
