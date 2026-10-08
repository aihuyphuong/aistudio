export const STAGES = [
  { id: 'development', label: 'Phát triển', icon: '💡', hint: 'Ý tưởng, logline, AI dựng dàn ý' },
  { id: 'story', label: 'Cốt truyện', icon: '🕸️', hint: 'Đồ thị liên kết truyện (React Flow)' },
  { id: 'cast', label: 'Casting', icon: '🎭', hint: 'Nhân vật, giọng, bối cảnh' },
  { id: 'script', label: 'Kịch bản', icon: '📜', hint: 'Thoại & chỉ dẫn diễn xuất' },
  { id: 'storyboard', label: 'Phân cảnh', icon: '🎞️', hint: 'Shot list, cỡ cảnh, chuyển động máy' },
  { id: 'previz', label: 'Dàn dựng 3D', icon: '🎥', hint: 'Kéo thả máy quay & nhân vật' },
  { id: 'voice', label: 'Lồng tiếng', icon: '🎙️', hint: 'ElevenLabs / VoiceStudio' },
  { id: 'generate', label: 'Quay (AI)', icon: '✨', hint: 'Sinh keyframe & video cho từng shot' },
  { id: 'edit', label: 'Dựng phim', icon: '✂️', hint: 'Timeline & xem animatic' },
  { id: 'export', label: 'Xuất bản', icon: '📦', hint: 'Xuất dự án, kịch bản, shot list' },
] as const;

export type StageId = (typeof STAGES)[number]['id'];

export const stageNumber = (id: StageId) => STAGES.findIndex((s) => s.id === id) + 1;
