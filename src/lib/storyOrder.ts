import type { Scene, StoryGraph } from '../types';

/**
 * Sắp xếp cảnh theo luồng trong đồ thị: đi từ các nút không có cạnh vào
 * (ưu tiên nút "start"), duyệt theo chiều sâu, nhánh rẽ được thứ tự theo
 * vị trí trên canvas. Cảnh không nối vào đồ thị được xếp cuối.
 */
export function orderScenes(scenes: Scene[], story: StoryGraph): Scene[] {
  const byId = new Map(story.nodes.map((n) => [n.id, n]));
  const outgoing = new Map<string, string[]>();
  const incoming = new Set<string>();
  for (const e of story.edges) {
    if (!byId.has(e.source) || !byId.has(e.target)) continue;
    outgoing.set(e.source, [...(outgoing.get(e.source) ?? []), e.target]);
    incoming.add(e.target);
  }
  const pos = (id: string) => byId.get(id)?.position ?? { x: 0, y: 0 };
  const roots = story.nodes
    .filter((n) => !incoming.has(n.id))
    .sort((a, b) =>
      a.data.kind === 'start' ? -1 : b.data.kind === 'start' ? 1 : a.position.x - b.position.x,
    );

  const visited = new Set<string>();
  const sceneIds: string[] = [];
  const visit = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    const node = byId.get(id);
    if (node?.data.sceneId) sceneIds.push(node.data.sceneId);
    const next = [...(outgoing.get(id) ?? [])].sort((a, b) => pos(a).y - pos(b).y || pos(a).x - pos(b).x);
    next.forEach(visit);
  };
  roots.forEach((r) => visit(r.id));
  story.nodes.forEach((n) => visit(n.id));

  const sceneMap = new Map(scenes.map((s) => [s.id, s]));
  const ordered = sceneIds.map((id) => sceneMap.get(id)).filter((s): s is Scene => !!s);
  const rest = scenes.filter((s) => !sceneIds.includes(s.id));
  return [...ordered, ...rest];
}
