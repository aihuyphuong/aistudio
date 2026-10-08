import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeProps,
} from '@xyflow/react';
import { Field, StageHeader } from '../../components/ui';
import { shotsOfScene, useProject } from '../../store/projectStore';
import { useUI } from '../../store/uiStore';
import type { StoryNode, StoryNodeKind } from '../../types';

const KIND_META: Record<StoryNodeKind, { label: string; icon: string }> = {
  start: { label: 'Mở đầu', icon: '▶' },
  scene: { label: 'Cảnh', icon: '🎬' },
  beat: { label: 'Nhịp truyện', icon: '♪' },
  choice: { label: 'Rẽ nhánh', icon: '⑂' },
  end: { label: 'Kết thúc', icon: '■' },
};

function StoryNodeView({ data, selected }: NodeProps<StoryNode>) {
  const meta = KIND_META[data.kind];
  const lineCount = useProject((s) => (data.sceneId ? (s.project.scenes.find((sc) => sc.id === data.sceneId)?.lines.length ?? 0) : 0));
  return (
    <div className={`story-node kind-${data.kind} ${selected ? 'selected' : ''}`}>
      {data.kind !== 'start' && <Handle type="target" position={Position.Left} />}
      <div className="story-node-kind">
        {meta.icon} {meta.label}
        {data.kind === 'scene' && <span className="muted"> · {lineCount} thoại</span>}
      </div>
      <div className="story-node-title">{data.label}</div>
      {data.text && <div className="story-node-text">{data.text}</div>}
      {data.kind !== 'end' && <Handle type="source" position={Position.Right} />}
    </div>
  );
}

const nodeTypes = { story: StoryNodeView };

function Graph() {
  const story = useProject((s) => s.project.story);
  const { onNodesChange, onEdgesChange, onConnect, addStoryNode, updateEdgeLabel } = useProject.getState();
  const { screenToFlowPosition } = useReactFlow();

  const addAtCenter = (kind: StoryNodeKind) => {
    const pane = document.querySelector('.story-canvas')!.getBoundingClientRect();
    const p = screenToFlowPosition({ x: pane.left + pane.width / 2, y: pane.top + pane.height / 2 });
    addStoryNode(kind, { x: p.x + Math.random() * 40, y: p.y + Math.random() * 40 });
  };

  return (
    <div className="story-canvas">
      <div className="story-toolbar">
        {(['scene', 'beat', 'choice', 'end'] as const).map((k) => (
          <button key={k} onClick={() => addAtCenter(k)}>
            + {KIND_META[k].icon} {KIND_META[k].label}
          </button>
        ))}
        <span className="muted small">Kéo từ chấm bên phải để nối · nháy đúp vào đường nối để đặt nhãn · Delete để xoá</span>
      </div>
      <ReactFlow
        nodes={story.nodes}
        edges={story.edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeDoubleClick={(_, edge) => {
          const label = prompt('Nhãn cho liên kết (ví dụ: lựa chọn A, “sáng hôm sau”…)', String(edge.label ?? ''));
          if (label !== null) updateEdgeLabel(edge.id, label);
        }}
        defaultEdgeOptions={{ animated: true }}
        fitView
        colorMode="dark"
      >
        <Background gap={24} />
        <MiniMap pannable zoomable />
        <Controls />
      </ReactFlow>
    </div>
  );
}

function Inspector() {
  const node = useProject((s) => s.project.story.nodes.find((n) => n.selected));
  const project = useProject((s) => s.project);
  const { updateStoryNode, updateScene } = useProject.getState();
  if (!node) {
    return (
      <div className="inspector muted">
        Chọn một nút để chỉnh sửa. Đồ thị quyết định thứ tự cảnh trong kịch bản, phân cảnh và timeline; nút “Rẽ nhánh” cho phép dựng nhiều phiên bản/kết thúc.
      </div>
    );
  }
  const scene = project.scenes.find((s) => s.id === node.data.sceneId);
  return (
    <div className="inspector">
      <div className="stage-step">{KIND_META[node.data.kind].label}</div>
      <Field label="Tiêu đề">
        <input value={node.data.label} onChange={(e) => updateStoryNode(node.id, { label: e.target.value })} />
      </Field>
      <Field label={scene ? 'Tóm tắt cảnh' : 'Ghi chú'}>
        <textarea rows={5} value={node.data.text} onChange={(e) => updateStoryNode(node.id, { text: e.target.value })} />
      </Field>
      {scene && (
        <>
          <div className="grid-2 tight">
            <Field label="Bối cảnh">
              <select value={scene.locationId ?? ''} onChange={(e) => updateScene(scene.id, { locationId: e.target.value || null })}>
                <option value="">—</option>
                {project.locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Thời điểm">
              <input value={scene.timeOfDay} onChange={(e) => updateScene(scene.id, { timeOfDay: e.target.value })} />
            </Field>
          </div>
          <p className="muted small">
            {scene.lines.length} câu thoại · {shotsOfScene(project, scene.id).length} shot
          </p>
          <div className="row">
            <button onClick={() => useUI.getState().setStage('script')}>Viết thoại →</button>
            <button onClick={() => useUI.getState().setStage('storyboard')}>Phân cảnh →</button>
          </div>
        </>
      )}
    </div>
  );
}

export function StoryStage() {
  return (
    <div className="stage stage-fill">
      <StageHeader step={2} title="Cốt truyện" subtitle="Mô tả liên kết giữa các cảnh, nhịp truyện và các nhánh rẽ." />
      <div className="story-layout">
        <ReactFlowProvider>
          <Graph />
        </ReactFlowProvider>
        <Inspector />
      </div>
    </div>
  );
}
