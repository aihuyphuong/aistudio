import { Grid, OrbitControls, PerspectiveCamera, TransformControls, useHelper } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { CameraHelper, CanvasTexture, SRGBColorSpace, type Group, type Mesh, type Object3D, type PerspectiveCamera as PerspectiveCameraImpl } from 'three';
import { focalToFov } from '../../lib/camera';
import type { Blocking, CameraRig, Character, Vec3 } from '../../types';

export type Selection = { type: 'character'; id: string } | { type: 'camera' } | { type: 'target' } | null;
export type ViewMode = 'director' | 'camera';
export type GizmoMode = 'translate' | 'rotate';

export interface PrevizHandle {
  /** Chụp khung hình nhìn qua máy quay của shot (ẩn mọi đối tượng trợ giúp). */
  snapshot: () => string;
}

interface Props {
  camera: CameraRig;
  blocking: Blocking[];
  characters: Character[];
  view: ViewMode;
  gizmo: GizmoMode;
  selection: Selection;
  onSelect: (s: Selection) => void;
  onCameraChange: (camera: Pick<CameraRig, 'position' | 'target'>) => void;
  onBlockingChange: (characterId: string, position: Vec3, rotationY: number) => void;
}

const toVec3 = (o: Object3D): Vec3 => [o.position.x, o.position.y, o.position.z].map((n) => Math.round(n * 100) / 100) as Vec3;

/** Nhãn tên vẽ lên canvas → sprite luôn quay về phía camera. */
function NameTag({ text, color, highlight }: { text: string; color: string; highlight: boolean }) {
  const { texture, aspect } = useMemo(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const font = '600 44px system-ui, sans-serif';
    ctx.font = font;
    canvas.width = Math.ceil(ctx.measureText(text).width) + 40;
    canvas.height = 68;
    ctx.font = font;
    ctx.fillStyle = highlight ? '#ffb547' : 'rgba(0,0,0,0.75)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(2, 2, canvas.width - 4, canvas.height - 4, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = highlight ? '#1a1205' : '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 20, canvas.height / 2 + 2);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return { texture, aspect: canvas.width / canvas.height };
  }, [text, color, highlight]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={[0, 2.15, 0]} scale={[0.4 * aspect, 0.4, 1]} userData={{ editorOnly: true }} renderOrder={10}>
      <spriteMaterial map={texture} depthTest={false} transparent />
    </sprite>
  );
}

/** Hình nhân đơn giản: thân, đầu, mũi chỉ hướng nhìn và nhãn tên. */
const Mannequin = forwardRef<Group, { character: Character; blocking: Blocking; selected: boolean; onSelect: () => void }>(
  ({ character, blocking, selected, onSelect }, ref) => (
    <group
      ref={ref}
      position={blocking.position}
      rotation={[0, blocking.rotationY, 0]}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <mesh position={[0, 0.85, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.9, 8, 16]} />
        <meshStandardMaterial color={character.color} emissive={selected ? '#ffffff' : '#000000'} emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0, 1.6, 0]} castShadow>
        <sphereGeometry args={[0.16, 24, 16]} />
        <meshStandardMaterial color="#e8c9a8" />
      </mesh>
      <mesh position={[0, 1.6, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.04, 0.1, 12]} />
        <meshStandardMaterial color="#c99a75" />
      </mesh>
      <NameTag text={character.name} color={character.color} highlight={selected} />
    </group>
  ),
);

export const PrevizScene = forwardRef<PrevizHandle, Props>(function PrevizScene(props, handle) {
  const { camera, blocking, characters, view, gizmo, selection, onSelect, onCameraChange, onBlockingChange } = props;
  const { gl, scene } = useThree();

  const rigRef = useRef<PerspectiveCameraImpl>(null!);
  const targetRef = useRef<Mesh>(null!);
  const rigBodyRef = useRef<Group>(null!);
  const charRefs = useRef(new Map<string, Group>());
  const gizmoRef = useRef<Object3D>(null);
  const [selectedObject, setSelectedObject] = useState<Object3D | null>(null);
  const helperRef = useHelper(view === 'director' && (rigRef as RefObject<PerspectiveCameraImpl>), CameraHelper);

  // Máy quay luôn hướng vào điểm ngắm
  const aim = () => rigRef.current?.lookAt(targetRef.current.position);
  useLayoutEffect(aim, [camera.position, camera.target]);

  // Gắn gizmo vào đối tượng đang chọn (sau khi các ref đã gắn)
  useEffect(() => {
    if (view !== 'director' || !selection) return setSelectedObject(null);
    if (selection.type === 'camera') setSelectedObject(rigRef.current);
    else if (selection.type === 'target') setSelectedObject(targetRef.current);
    else setSelectedObject(charRefs.current.get(selection.id) ?? null);
  }, [selection, view, blocking]);

  useImperativeHandle(handle, () => ({
    snapshot() {
      const hidden: Object3D[] = [rigBodyRef.current, targetRef.current, helperRef.current, gizmoRef.current].filter(
        (o): o is Object3D => !!o && o.visible,
      );
      scene.traverse((o) => o.userData.editorOnly && o.visible && hidden.push(o));
      hidden.forEach((o) => (o.visible = false));
      gl.render(scene, rigRef.current);
      const url = gl.domElement.toDataURL('image/jpeg', 0.9);
      hidden.forEach((o) => (o.visible = true));
      return url;
    },
  }));

  const commitCamera = () => onCameraChange({ position: toVec3(rigRef.current), target: toVec3(targetRef.current) });
  const commit = () => {
    if (selection?.type !== 'character') return commitCamera();
    const obj = charRefs.current.get(selection.id);
    if (obj) onBlockingChange(selection.id, toVec3(obj), Math.round(obj.rotation.y * 1000) / 1000);
  };

  const isCharacter = selection?.type === 'character';

  return (
    <>
      <color attach="background" args={['#14161c']} />
      <hemisphereLight args={['#b8c7ff', '#3a2e22', 0.8]} />
      <directionalLight position={[5, 8, 4]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <Grid args={[40, 40]} cellColor="#2b3040" sectionColor="#4a5370" fadeDistance={35} infiniteGrid />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <shadowMaterial opacity={0.35} />
      </mesh>

      {blocking.map((b) => {
        const character = characters.find((c) => c.id === b.characterId);
        if (!character) return null;
        return (
          <Mannequin
            key={b.characterId}
            ref={(g) => {
              if (g) charRefs.current.set(b.characterId, g);
              else charRefs.current.delete(b.characterId);
            }}
            character={character}
            blocking={b}
            selected={selection?.type === 'character' && selection.id === b.characterId}
            onSelect={() => onSelect({ type: 'character', id: b.characterId })}
          />
        );
      })}

      {/* Máy quay của shot: là camera thật, thân máy chỉ hiện ở chế độ đạo diễn */}
      <PerspectiveCamera
        ref={rigRef}
        makeDefault={view === 'camera'}
        position={camera.position}
        fov={focalToFov(camera.focalLength)}
        near={0.05}
        far={40}
      >
        <group ref={rigBodyRef} visible={view === 'director'} onPointerDown={(e) => (e.stopPropagation(), onSelect({ type: 'camera' }))}>
          <mesh position={[0, 0, 0.18]}>
            <boxGeometry args={[0.25, 0.3, 0.4]} />
            <meshStandardMaterial color={selection?.type === 'camera' ? '#ffd166' : '#d0d4dc'} />
          </mesh>
          <mesh position={[0, 0, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.1, 0.16, 20]} />
            <meshStandardMaterial color="#222" />
          </mesh>
        </group>
      </PerspectiveCamera>

      <mesh
        ref={targetRef}
        position={camera.target}
        visible={view === 'director'}
        onPointerDown={(e) => (e.stopPropagation(), onSelect({ type: 'target' }))}
      >
        <sphereGeometry args={[0.08, 16, 12]} />
        <meshBasicMaterial color={selection?.type === 'target' ? '#ffd166' : '#ef476f'} />
      </mesh>

      {view === 'director' && selectedObject && (
        <TransformControls
          ref={gizmoRef as never}
          object={selectedObject}
          mode={isCharacter ? gizmo : 'translate'}
          showX={!(isCharacter && gizmo === 'rotate')}
          showY={!isCharacter || gizmo === 'rotate'}
          showZ={!(isCharacter && gizmo === 'rotate')}
          size={0.8}
          onObjectChange={aim}
          onMouseUp={commit}
        />
      )}

      {view === 'director' ? (
        <OrbitControls key="director" makeDefault target={[0, 1, 0]} maxPolarAngle={Math.PI / 2 - 0.02} />
      ) : (
        // Nhìn qua ống kính: xoay/zoom để đặt góc máy, lưu khi thả chuột
        <OrbitControls key="lens" makeDefault target={camera.target} onEnd={commitCamera} />
      )}
    </>
  );
});
