import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SHOT_SIZE_DEFAULTS } from '../lib/camera';
import { uid } from '../lib/id';
import type {
  Blocking,
  Character,
  DialogueLine,
  Location,
  Project,
  Scene,
  Settings,
  Shot,
  ShotSize,
  StoryEdge,
  StoryNode,
  StoryNodeKind,
  Vec3,
} from '../types';
import { sampleProject } from './sample';

const PALETTE = ['#e4572e', '#29335c', '#f3a712', '#669bbc', '#a8c686', '#8e7dbe', '#d1495b', '#00798c'];

export const emptyProject = (): Project => ({
  id: uid('proj_'),
  schemaVersion: 1,
  development: {
    title: 'Dự án mới',
    logline: '',
    synopsis: '',
    genre: '',
    tone: '',
    audience: '',
    language: 'vi',
    targetDuration: 60,
    aspectRatio: '16:9',
    narratorVoice: null,
  },
  characters: [],
  locations: [],
  scenes: [],
  shots: [],
  story: {
    nodes: [
      { id: 'start', type: 'story', position: { x: 0, y: 0 }, data: { kind: 'start', label: 'Mở đầu', text: '' } },
    ],
    edges: [],
  },
  updatedAt: Date.now(),
});

export const defaultSettings: Settings = {
  anthropic: { apiKey: '', model: 'claude-opus-5-5' },
  elevenlabs: { apiKey: '', modelId: 'eleven_v3' },
  voicestudio: { baseUrl: '/voicestudio', apiKey: '', model: 'omnivoice' },
  defaultVoiceProvider: 'elevenlabs',
};

/** Dàn dựng mặc định: xếp nhân vật có thoại trong cảnh thành hàng ngang, máy quay đặt phía trước. */
export function defaultStaging(characterIds: string[], size: ShotSize): Pick<Shot, 'camera' | 'blocking'> {
  const spacing = 1.4;
  const blocking: Blocking[] = characterIds.map((characterId, i) => ({
    characterId,
    position: [(i - (characterIds.length - 1) / 2) * spacing, 0, 0],
    rotationY: 0,
  }));
  const { distance, focal } = SHOT_SIZE_DEFAULTS[size];
  const target: Vec3 = [0, 1.5, 0];
  return {
    blocking,
    camera: { position: [0, 1.6, distance], target, focalLength: focal },
  };
}

export interface OutlineInput {
  characters: Omit<Character, 'id' | 'color' | 'voice'>[];
  locations: Omit<Location, 'id'>[];
  scenes: {
    title: string;
    summary: string;
    location: string;
    timeOfDay: string;
    lines: { character: string; text: string; emotion: string }[];
  }[];
  links: { from: number; to: number; label: string }[];
}

export interface ShotInput {
  size: ShotSize;
  movement: Shot['movement'];
  duration: number;
  description: string;
  prompt: string;
  lineIndexes: number[];
}

type Patch<T> = Partial<Omit<T, 'id'>>;

interface ProjectState {
  project: Project;
  settings: Settings;
  updateSettings: (fn: (s: Settings) => Settings) => void;

  newProject: () => void;
  loadProject: (p: Project) => void;
  loadSample: () => void;
  applyOutline: (o: OutlineInput) => void;

  setDevelopment: (patch: Partial<Project['development']>) => void;

  addCharacter: () => string;
  updateCharacter: (id: string, patch: Patch<Character>) => void;
  removeCharacter: (id: string) => void;
  addLocation: () => string;
  updateLocation: (id: string, patch: Patch<Location>) => void;
  removeLocation: (id: string) => void;

  addScene: (position?: { x: number; y: number }, linkFrom?: string) => string;
  updateScene: (id: string, patch: Patch<Scene>) => void;
  removeScene: (id: string) => void;
  addLine: (sceneId: string, characterId?: string | null) => void;
  updateLine: (sceneId: string, lineId: string, patch: Patch<DialogueLine>) => void;
  removeLine: (sceneId: string, lineId: string) => void;
  moveLine: (sceneId: string, lineId: string, delta: -1 | 1) => void;

  onNodesChange: (changes: NodeChange<StoryNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<StoryEdge>[]) => void;
  onConnect: (c: Connection) => void;
  addStoryNode: (kind: StoryNodeKind, position: { x: number; y: number }) => void;
  updateStoryNode: (id: string, patch: Partial<StoryNode['data']>) => void;
  updateEdgeLabel: (id: string, label: string) => void;

  addShot: (sceneId: string, size?: ShotSize) => string;
  replaceShots: (sceneId: string, shots: ShotInput[]) => void;
  updateShot: (id: string, patch: Patch<Shot>) => void;
  toggleShotLine: (shotId: string, lineId: string) => void;
  removeShot: (id: string) => void;
  moveShot: (id: string, delta: -1 | 1) => void;
}

const move = <T>(arr: T[], index: number, delta: number): T[] => {
  const to = index + delta;
  if (index < 0 || to < 0 || to >= arr.length) return arr;
  const copy = [...arr];
  [copy[index], copy[to]] = [copy[to], copy[index]];
  return copy;
};

export const useProject = create<ProjectState>()(
  persist(
    (set, get) => {
      /** Cập nhật dự án bất biến và đóng dấu thời gian. */
      const mutate = (fn: (p: Project) => Partial<Project>) =>
        set((s) => ({ project: { ...s.project, ...fn(s.project), updatedAt: Date.now() } }));

      const sceneCharacters = (scene: Scene | undefined) =>
        [...new Set((scene?.lines ?? []).map((l) => l.characterId).filter((c): c is string => !!c))];

      return {
        project: sampleProject(),
        settings: defaultSettings,
        updateSettings: (fn) => set((s) => ({ settings: fn(s.settings) })),

        newProject: () => set({ project: emptyProject() }),
        loadProject: (p) => set({ project: p }),
        loadSample: () => set({ project: sampleProject() }),

        applyOutline: (o) =>
          mutate((p) => {
            const characters: Character[] = o.characters.map((c, i) => ({
              ...c,
              id: uid('char_'),
              color: PALETTE[i % PALETTE.length],
              voice: null,
            }));
            const locations: Location[] = o.locations.map((l) => ({ ...l, id: uid('loc_') }));
            const findChar = (name: string) =>
              characters.find((c) => c.name.toLowerCase() === name.trim().toLowerCase())?.id ?? null;
            const findLoc = (name: string) =>
              locations.find((l) => l.name.toLowerCase() === name.trim().toLowerCase())?.id ?? null;
            const scenes: Scene[] = o.scenes.map((s) => ({
              id: uid('scene_'),
              title: s.title,
              summary: s.summary,
              locationId: findLoc(s.location),
              timeOfDay: s.timeOfDay,
              lines: s.lines.map((l) => ({
                id: uid('line_'),
                characterId: findChar(l.character),
                text: l.text,
                emotion: l.emotion,
              })),
            }));
            const nodes: StoryNode[] = [
              { id: 'start', type: 'story', position: { x: 0, y: 0 }, data: { kind: 'start', label: 'Mở đầu', text: p.development.logline } },
              ...scenes.map<StoryNode>((s, i) => ({
                id: `node_${s.id}`,
                type: 'story',
                position: { x: 300 * (i + 1), y: (i % 2) * 80 },
                data: { kind: 'scene', label: s.title, text: s.summary, sceneId: s.id },
              })),
            ];
            const edges: StoryEdge[] = [];
            if (scenes[0]) edges.push({ id: uid('edge_'), source: 'start', target: `node_${scenes[0].id}` });
            const links = o.links.length
              ? o.links
              : scenes.slice(1).map((_, i) => ({ from: i, to: i + 1, label: '' }));
            for (const l of links) {
              const a = scenes[l.from];
              const b = scenes[l.to];
              if (a && b) edges.push({ id: uid('edge_'), source: `node_${a.id}`, target: `node_${b.id}`, label: l.label || undefined });
            }
            return { characters, locations, scenes, shots: [], story: { nodes, edges } };
          }),

        setDevelopment: (patch) => mutate((p) => ({ development: { ...p.development, ...patch } })),

        addCharacter: () => {
          const id = uid('char_');
          mutate((p) => ({
            characters: [
              ...p.characters,
              {
                id,
                name: `Nhân vật ${p.characters.length + 1}`,
                role: '',
                description: '',
                visualPrompt: '',
                color: PALETTE[p.characters.length % PALETTE.length],
                voice: null,
              },
            ],
          }));
          return id;
        },
        updateCharacter: (id, patch) =>
          mutate((p) => ({ characters: p.characters.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
        removeCharacter: (id) =>
          mutate((p) => ({
            characters: p.characters.filter((c) => c.id !== id),
            scenes: p.scenes.map((s) => ({
              ...s,
              lines: s.lines.map((l) => (l.characterId === id ? { ...l, characterId: null } : l)),
            })),
            shots: p.shots.map((sh) => ({ ...sh, blocking: sh.blocking.filter((b) => b.characterId !== id) })),
          })),

        addLocation: () => {
          const id = uid('loc_');
          mutate((p) => ({
            locations: [...p.locations, { id, name: `Bối cảnh ${p.locations.length + 1}`, description: '', visualPrompt: '' }],
          }));
          return id;
        },
        updateLocation: (id, patch) =>
          mutate((p) => ({ locations: p.locations.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
        removeLocation: (id) =>
          mutate((p) => ({
            locations: p.locations.filter((l) => l.id !== id),
            scenes: p.scenes.map((s) => (s.locationId === id ? { ...s, locationId: null } : s)),
          })),

        addScene: (position, linkFrom) => {
          const id = uid('scene_');
          mutate((p) => {
            const title = `Cảnh ${p.scenes.length + 1}`;
            const last = p.story.nodes[p.story.nodes.length - 1];
            const node: StoryNode = {
              id: `node_${id}`,
              type: 'story',
              position: position ?? { x: (last?.position.x ?? 0) + 300, y: last?.position.y ?? 0 },
              data: { kind: 'scene', label: title, text: '', sceneId: id },
            };
            const edges = linkFrom
              ? [...p.story.edges, { id: uid('edge_'), source: linkFrom, target: node.id }]
              : p.story.edges;
            return {
              scenes: [...p.scenes, { id, title, summary: '', locationId: null, timeOfDay: 'Ngày', lines: [] }],
              story: { nodes: [...p.story.nodes, node], edges },
            };
          });
          return id;
        },
        updateScene: (id, patch) =>
          mutate((p) => ({
            scenes: p.scenes.map((s) => (s.id === id ? { ...s, ...patch } : s)),
            // Giữ nhãn nút trong đồ thị đồng bộ với tiêu đề/tóm tắt cảnh
            story: {
              ...p.story,
              nodes: p.story.nodes.map((n) =>
                n.data.sceneId === id
                  ? {
                      ...n,
                      data: {
                        ...n.data,
                        ...(patch.title !== undefined && { label: patch.title }),
                        ...(patch.summary !== undefined && { text: patch.summary }),
                      },
                    }
                  : n,
              ),
            },
          })),
        removeScene: (id) =>
          mutate((p) => {
            const nodeIds = new Set(p.story.nodes.filter((n) => n.data.sceneId === id).map((n) => n.id));
            return {
              scenes: p.scenes.filter((s) => s.id !== id),
              shots: p.shots.filter((sh) => sh.sceneId !== id),
              story: {
                nodes: p.story.nodes.filter((n) => !nodeIds.has(n.id)),
                edges: p.story.edges.filter((e) => !nodeIds.has(e.source) && !nodeIds.has(e.target)),
              },
            };
          }),

        addLine: (sceneId, characterId = null) =>
          mutate((p) => ({
            scenes: p.scenes.map((s) =>
              s.id === sceneId
                ? { ...s, lines: [...s.lines, { id: uid('line_'), characterId, text: '', emotion: '' }] }
                : s,
            ),
          })),
        updateLine: (sceneId, lineId, patch) =>
          mutate((p) => ({
            scenes: p.scenes.map((s) =>
              s.id === sceneId ? { ...s, lines: s.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)) } : s,
            ),
          })),
        removeLine: (sceneId, lineId) =>
          mutate((p) => ({
            scenes: p.scenes.map((s) => (s.id === sceneId ? { ...s, lines: s.lines.filter((l) => l.id !== lineId) } : s)),
            shots: p.shots.map((sh) => ({ ...sh, lineIds: sh.lineIds.filter((l) => l !== lineId) })),
          })),
        moveLine: (sceneId, lineId, delta) =>
          mutate((p) => ({
            scenes: p.scenes.map((s) =>
              s.id === sceneId ? { ...s, lines: move(s.lines, s.lines.findIndex((l) => l.id === lineId), delta) } : s,
            ),
          })),

        onNodesChange: (changes) =>
          mutate((p) => {
            // Xoá nút cảnh trong đồ thị cũng xoá cảnh tương ứng
            const removedScenes = changes
              .filter((c) => c.type === 'remove')
              .map((c) => p.story.nodes.find((n) => n.id === c.id)?.data.sceneId)
              .filter((s): s is string => !!s);
            const nodes = applyNodeChanges(
              changes.filter((c) => !(c.type === 'remove' && c.id === 'start')),
              p.story.nodes,
            );
            return {
              story: { ...p.story, nodes },
              scenes: p.scenes.filter((s) => !removedScenes.includes(s.id)),
              shots: p.shots.filter((sh) => !removedScenes.includes(sh.sceneId)),
            };
          }),
        onEdgesChange: (changes) =>
          mutate((p) => ({ story: { ...p.story, edges: applyEdgeChanges(changes, p.story.edges) } })),
        onConnect: (c) =>
          mutate((p) => ({ story: { ...p.story, edges: addEdge({ ...c, id: uid('edge_') }, p.story.edges) } })),
        addStoryNode: (kind, position) => {
          if (kind === 'scene') {
            get().addScene(position);
            return;
          }
          const labels: Record<StoryNodeKind, string> = {
            start: 'Mở đầu',
            scene: 'Cảnh',
            beat: 'Nhịp truyện',
            choice: 'Rẽ nhánh',
            end: 'Kết thúc',
          };
          mutate((p) => ({
            story: {
              ...p.story,
              nodes: [...p.story.nodes, { id: uid('node_'), type: 'story', position, data: { kind, label: labels[kind], text: '' } }],
            },
          }));
        },
        updateStoryNode: (id, patch) => {
          const node = get().project.story.nodes.find((n) => n.id === id);
          if (node?.data.sceneId && (patch.label !== undefined || patch.text !== undefined)) {
            get().updateScene(node.data.sceneId, {
              ...(patch.label !== undefined && { title: patch.label }),
              ...(patch.text !== undefined && { summary: patch.text }),
            });
            return;
          }
          mutate((p) => ({
            story: {
              ...p.story,
              nodes: p.story.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
            },
          }));
        },
        updateEdgeLabel: (id, label) =>
          mutate((p) => ({
            story: { ...p.story, edges: p.story.edges.map((e) => (e.id === id ? { ...e, label: label || undefined } : e)) },
          })),

        addShot: (sceneId, size = 'MS') => {
          const id = uid('shot_');
          mutate((p) => {
            const scene = p.scenes.find((s) => s.id === sceneId);
            const previous = [...p.shots].reverse().find((sh) => sh.sceneId === sceneId);
            // Kế thừa dàn dựng của shot trước trong cùng cảnh để giữ tính liên tục
            const staging = previous
              ? { camera: structuredClone(previous.camera), blocking: structuredClone(previous.blocking) }
              : defaultStaging(sceneCharacters(scene), size);
            const shot: Shot = {
              id,
              sceneId,
              size,
              movement: 'static',
              duration: 4,
              description: '',
              prompt: '',
              lineIds: [],
              status: 'draft',
              ...staging,
            };
            return { shots: [...p.shots, shot] };
          });
          return id;
        },
        replaceShots: (sceneId, inputs) =>
          mutate((p) => {
            const scene = p.scenes.find((s) => s.id === sceneId);
            const shots: Shot[] = inputs.map((i) => ({
              id: uid('shot_'),
              sceneId,
              size: i.size,
              movement: i.movement,
              duration: i.duration,
              description: i.description,
              prompt: i.prompt,
              lineIds: i.lineIndexes.map((idx) => scene?.lines[idx]?.id).filter((x): x is string => !!x),
              status: 'draft',
              ...defaultStaging(sceneCharacters(scene), i.size),
            }));
            return { shots: [...p.shots.filter((sh) => sh.sceneId !== sceneId), ...shots] };
          }),
        updateShot: (id, patch) =>
          mutate((p) => ({ shots: p.shots.map((sh) => (sh.id === id ? { ...sh, ...patch } : sh)) })),
        toggleShotLine: (shotId, lineId) =>
          mutate((p) => {
            const on = !p.shots.find((sh) => sh.id === shotId)?.lineIds.includes(lineId);
            // Mỗi câu thoại chỉ thuộc một shot: gán vào shot này thì gỡ khỏi shot khác
            return {
              shots: p.shots.map((sh) => {
                const rest = sh.lineIds.filter((l) => l !== lineId);
                return { ...sh, lineIds: sh.id === shotId && on ? [...rest, lineId] : rest };
              }),
            };
          }),
        removeShot: (id) => mutate((p) => ({ shots: p.shots.filter((sh) => sh.id !== id) })),
        moveShot: (id, delta) =>
          mutate((p) => {
            const shot = p.shots.find((s) => s.id === id);
            if (!shot) return {};
            // Chỉ hoán đổi với shot liền kề trong cùng cảnh
            const sameScene = p.shots.filter((s) => s.sceneId === shot.sceneId);
            const neighbour = sameScene[sameScene.indexOf(shot) + delta];
            if (!neighbour) return {};
            const a = p.shots.indexOf(shot);
            const b = p.shots.indexOf(neighbour);
            return { shots: move(p.shots, a, b - a) };
          }),
      };
    },
    {
      name: 'aistudio-project',
      version: 1,
    },
  ),
);

/** Lấy shot theo thứ tự cảnh của câu chuyện. */
export const shotsOfScene = (project: Project, sceneId: string) => project.shots.filter((s) => s.sceneId === sceneId);
