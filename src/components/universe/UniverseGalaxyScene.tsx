'use client';

import { Component, type ReactNode, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { UniverseModel } from '@/lib/universe';

/**
 * WebGL 能力探测。
 *
 * 之前这里给 `<Canvas>` 传了一个 `onError`，但 react-three-fiber 9.8 的
 * `CanvasProps` 根本没有这个属性——它继承了 div 的属性，于是 `onError`
 * 变成了一个永远不会触发的 DOM 事件监听器，`webglFailed` 恒为 false，
 * 降级分支是死代码（而 `tsc` 不报错，因为它确实是合法 prop）。
 *
 * 现在改成构建前主动探一次上下文，外加一层错误边界兜住场景内部抛出的异常：
 * r3f 在渲染器创建失败时是把错误往外抛的。
 */
function supportsWebGL(): boolean {
  if (typeof document === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) return false;
    // 探测用的上下文要立刻释放，否则在部分移动浏览器上会占掉有限的上下文名额
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('[universe] 三维星系场景初始化失败，已回退到目录视图', error);
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function createBodyTexture(model: UniverseModel, accent: string) {
  if (typeof document === 'undefined') return null;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const base = new THREE.Color(accent);
  const dark = base.clone().multiplyScalar(0.2);
  const light = base.clone().lerp(new THREE.Color('#e8f3fa'), 0.5);
  const gradient = context.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, `#${light.getHexString()}`);
  gradient.addColorStop(0.45, `#${base.getHexString()}`);
  gradient.addColorStop(1, `#${dark.getHexString()}`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  if (model.body === 'gas-giant' || model.body === 'ice-giant') {
    for (let index = 0; index < 20; index += 1) {
      const y = (index / 20) * size + Math.sin(index * 1.7) * 5;
      context.fillStyle = index % 3 === 0 ? 'rgba(239, 249, 255, 0.15)' : 'rgba(3, 9, 16, 0.12)';
      context.fillRect(0, y, size, 4 + (index % 4) * 3);
    }
  }
  if (model.body === 'dwarf' || model.body === 'planet') {
    for (let index = 0; index < 95; index += 1) {
      const x = (index * 71) % size;
      const y = (index * 113) % size;
      const radius = 1 + (index % 5);
      context.beginPath();
      context.fillStyle = index % 3 === 0 ? 'rgba(239, 249, 255, 0.12)' : 'rgba(3, 9, 16, 0.16)';
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function OrbitingBody({
  model,
  accent,
  index,
  selected,
  onSelect,
  reducedMotion,
}: {
  model: UniverseModel;
  accent: string;
  index: number;
  selected: boolean;
  onSelect: () => void;
  reducedMotion: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const orbit = 2.4 + (index % 3) * 0.75;
  const speed = 0.055 + index * 0.004;
  const phase = (index * Math.PI * 2) / Math.max(1, model.orbit);
  const texture = useMemo(() => createBodyTexture(model, accent), [model, accent]);

  useEffect(() => () => texture?.dispose(), [texture]);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    if (!reducedMotion) {
      group.current.rotation.y += delta * speed;
      group.current.rotation.z = Math.sin(clock.elapsedTime * 0.12 + phase) * 0.08;
      if (mesh.current) mesh.current.rotation.y += delta * 0.18;
    }
  });

  return (
    <group ref={group}>
      <mesh
        ref={mesh}
        position={[Math.cos(phase) * orbit, Math.sin(phase * 1.2) * 0.55, Math.sin(phase) * orbit]}
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        scale={0.14 + model.influence * 0.036}
      >
        <icosahedronGeometry args={[1, 6]} />
        <meshStandardMaterial
          map={texture}
          color={model.retired ? '#44515e' : selected ? '#f1f8fd' : '#c0d3e2'}
          emissive={model.retired ? '#26333e' : accent}
          emissiveIntensity={model.retired ? 0.04 : 0.16 + (model.eciPercentile ?? 20) / 500 + (selected ? 0.35 : 0)}
          roughness={0.78}
          metalness={0.12}
        />
      </mesh>
      <mesh scale={0.28 + model.influence * 0.05}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color={accent} transparent opacity={0.055} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function GalaxyCore({ accent, reducedMotion }: { accent: string; reducedMotion: boolean }) {
  const core = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (core.current && !reducedMotion) core.current.rotation.y += delta * 0.08;
  });
  return (
    <group>
      <mesh ref={core}>
        <sphereGeometry args={[0.56, 64, 64]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.85}
          roughness={0.32}
          metalness={0.38}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.77, 48, 48]} />
        <meshBasicMaterial color={accent} transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>
      <mesh rotation={[Math.PI / 2.7, 0.25, 0]}>
        <torusGeometry args={[1.45, 0.012, 8, 180]} />
        <meshBasicMaterial color={accent} transparent opacity={0.42} />
      </mesh>
      <mesh rotation={[Math.PI / 2.1, -0.4, 0.2]}>
        <torusGeometry args={[2.1, 0.009, 8, 180]} />
        <meshBasicMaterial color="#d9e7f4" transparent opacity={0.18} />
      </mesh>
    </group>
  );
}

function Scene({
  models,
  accent,
  selectedSlug,
  onSelect,
  reducedMotion,
}: {
  models: UniverseModel[];
  accent: string;
  selectedSlug: string | null;
  onSelect: (model: UniverseModel) => void;
  reducedMotion: boolean;
}) {
  return (
    <>
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        minDistance={4.2}
        maxDistance={12}
        minPolarAngle={Math.PI / 4.8}
        maxPolarAngle={Math.PI / 1.75}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.32}
      />
      <ambientLight intensity={0.08} />
      <pointLight position={[0, 0, 0]} intensity={5.5} color={accent} distance={12} />
      <directionalLight position={[5, 4, 5]} intensity={2.2} color="#c7dff2" />
      <directionalLight position={[-5, -2, 3]} intensity={0.8} color={accent} />
      <GalaxyCore accent={accent} reducedMotion={reducedMotion} />
      {models.map((model, index) => (
        <group key={model.slug}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[2.4 + (index % 3) * 0.75, 0.006, 6, 160]} />
            <meshBasicMaterial color={accent} transparent opacity={0.14} />
          </mesh>
          <OrbitingBody
            model={model}
            accent={accent}
            index={index}
            selected={selectedSlug === model.slug}
            onSelect={() => onSelect(model)}
            reducedMotion={reducedMotion}
          />
        </group>
      ))}
    </>
  );
}

export default function UniverseGalaxyScene({
  models,
  accent,
  selectedSlug,
  onSelect,
}: {
  models: UniverseModel[];
  accent: string;
  selectedSlug: string | null;
  onSelect: (model: UniverseModel) => void;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [webglFailed, setWebglFailed] = useState(() => !supportsWebGL());

  if (webglFailed) {
    return (
      <div className="universe-scene-fallback">
        <span>当前设备无法启用三维渲染。</span>
        <span>下方星体目录仍可继续浏览。</span>
      </div>
    );
  }

  return (
    <SceneBoundary onError={() => setWebglFailed(true)}>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 3.3, 7], fov: 44 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        /* 建不出上下文时 r3f 会把错误抛给上面的边界，这里不要再声明不存在的 prop */
      >
        <Scene
          models={models}
          accent={accent}
          selectedSlug={selectedSlug}
          onSelect={onSelect}
          reducedMotion={reducedMotion}
        />
      </Canvas>
    </SceneBoundary>
  );
}

/**
 * `prefers-reduced-motion` 要跟着系统设置变，不能只在首次渲染读一次：
 * 用户在系统设置里开关动效后，回到页面就该立刻停止自转。
 *
 * 用 `useSyncExternalStore` 而不是「effect 里 setState」：媒体查询是外部系统，
 * 这个 hook 正是为这类订阅准备的，也顺手避免了首帧多一次渲染。
 */
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function getReducedMotionSnapshot(): boolean {
  return window.matchMedia(REDUCED_MOTION).matches;
}

/** 服务端渲染时假设「不减少动效」，客户端水合后立刻换成真实值。 */
function getReducedMotionServerSnapshot(): boolean {
  return false;
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, getReducedMotionServerSnapshot);
}
