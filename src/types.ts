import type { Edge, Node } from '@xyflow/react';

export type ID = string;
export type Vec3 = [number, number, number];

// ───────────── 1. Phát triển ý tưởng ─────────────
export type AspectRatio = '16:9' | '9:16' | '2.39:1' | '1:1';

export interface Development {
  title: string;
  logline: string;
  synopsis: string;
  genre: string;
  tone: string;
  audience: string;
  language: string; // mã ISO 639-1, ví dụ "vi"
  targetDuration: number; // giây
  aspectRatio: AspectRatio;
  narratorVoice: VoiceAssignment | null; // giọng người dẫn chuyện
}

// ───────────── 2. Nhân vật & bối cảnh ─────────────
export type VoiceProviderId = 'elevenlabs' | 'voicestudio';

export interface VoiceAssignment {
  providerId: VoiceProviderId;
  voiceId: string;
  voiceName?: string;
}

export interface Character {
  id: ID;
  name: string;
  role: string; // nhân vật chính, phản diện, phụ...
  description: string; // tính cách, động cơ
  visualPrompt: string; // mô tả ngoại hình nhất quán cho model hình ảnh
  color: string; // màu đại diện trong không gian 3D / timeline
  voice: VoiceAssignment | null;
}

export interface Location {
  id: ID;
  name: string;
  description: string;
  visualPrompt: string;
}

// ───────────── 3. Kịch bản ─────────────
export interface DialogueLine {
  id: ID;
  characterId: ID | null; // null = người dẫn chuyện (narrator)
  text: string;
  emotion: string; // gợi ý diễn xuất: "thì thầm", "giận dữ"...
  audioAssetId?: ID;
  audioDuration?: number; // giây
}

export interface Scene {
  id: ID;
  title: string;
  summary: string;
  locationId: ID | null;
  timeOfDay: string;
  lines: DialogueLine[];
}

// ───────────── 4. Phân cảnh / Storyboard ─────────────
export type ShotSize = 'EWS' | 'WS' | 'FS' | 'MS' | 'MCU' | 'CU' | 'ECU' | 'OTS' | 'POV';
export type CameraMovement =
  | 'static'
  | 'pan'
  | 'tilt'
  | 'dolly-in'
  | 'dolly-out'
  | 'truck'
  | 'crane'
  | 'handheld'
  | 'orbit';

export interface CameraRig {
  position: Vec3;
  target: Vec3;
  focalLength: number; // mm, tính trên cảm biến full-frame
}

export interface Blocking {
  characterId: ID;
  position: Vec3;
  rotationY: number; // radian
}

export type ShotStatus = 'draft' | 'previz' | 'generating' | 'done' | 'error';

export interface Shot {
  id: ID;
  sceneId: ID;
  size: ShotSize;
  movement: CameraMovement;
  duration: number; // giây
  description: string;
  prompt: string; // prompt cho model sinh hình/video
  lineIds: ID[]; // các câu thoại thuộc shot
  camera: CameraRig;
  blocking: Blocking[];
  previzAssetId?: ID; // ảnh chụp từ góc máy 3D
  imageAssetId?: ID; // keyframe sinh bởi AI hoặc tải lên
  videoAssetId?: ID; // clip sinh bởi AI hoặc tải lên
  status: ShotStatus;
}

// ───────────── Đồ thị câu chuyện (React Flow) ─────────────
export type StoryNodeKind = 'start' | 'scene' | 'beat' | 'choice' | 'end';

export interface StoryNodeData extends Record<string, unknown> {
  kind: StoryNodeKind;
  label: string;
  text: string;
  sceneId?: ID;
}

export type StoryNode = Node<StoryNodeData>;
export type StoryEdge = Edge<{ label?: string }>;

export interface StoryGraph {
  nodes: StoryNode[];
  edges: StoryEdge[];
}

// ───────────── Dự án ─────────────
export interface Project {
  id: ID;
  schemaVersion: 1;
  development: Development;
  characters: Character[];
  locations: Location[];
  scenes: Scene[];
  shots: Shot[];
  story: StoryGraph;
  updatedAt: number;
}

export interface Settings {
  anthropic: { apiKey: string; model: string };
  elevenlabs: { apiKey: string; modelId: string };
  voicestudio: { baseUrl: string; apiKey: string; model: string };
  defaultVoiceProvider: VoiceProviderId;
}
