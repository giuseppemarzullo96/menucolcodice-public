'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';

/** Rotazione [x, y, z] in radianti (asse X = inclinazione, Y = rotazione orizzontale, Z = roll) */
function Model({ url, scale = 1, rotation }: { url: string; scale?: number; rotation?: [number, number, number] }) {
  const { scene } = useGLTF(url);
  return React.createElement('primitive', { object: scene, scale, rotation });
}

function Fallback() {
  return React.createElement('mesh', null,
    React.createElement('boxGeometry', { args: [1, 1, 1] }),
    React.createElement('meshStandardMaterial', { color: '#6b7280' })
  );
}

/** Config luci dal backend (themeColors.modelViewer) */
export type ModelViewerLights = {
  ambientIntensity?: number;
  directional1Position?: [number, number, number];
  directional1Intensity?: number;
  directional2Position?: [number, number, number];
  directional2Intensity?: number;
};

const defaultLights: Required<ModelViewerLights> = {
  ambientIntensity: 0.6,
  directional1Position: [5, 5, 5],
  directional1Intensity: 1,
  directional2Position: [-5, 5, -5],
  directional2Intensity: 0.5,
};

export function ModelViewer({
  modelUrl,
  height = 450,
  fill = false,
  scale = 1,
  rotation,
  lights,
  transparentBackground = true,
}: {
  modelUrl: string;
  height?: number;
  /** Riempie il contenitore padre (es. card quadrata nel carosello) */
  fill?: boolean;
  scale?: number;
  /** Rotazione iniziale [x, y, z] in radianti (es. [0.2, 0.5, 0] per inclinazione sulle card) */
  rotation?: [number, number, number];
  /** Luci configurabili da admin (themeColors.modelViewer) */
  lights?: ModelViewerLights | null;
  transparentBackground?: boolean;
}) {
  const L = lights ? { ...defaultLights, ...lights } : defaultLights;
  const dir1Pos = L.directional1Position ?? defaultLights.directional1Position;
  const dir2Pos = L.directional2Position ?? defaultLights.directional2Position;
  const boxHeight = fill ? '100%' : height;

  return (
    <div
      style={{
        width: '100%',
        height: boxHeight,
        minHeight: fill ? undefined : height,
        background: transparentBackground ? 'transparent' : '#1f2937',
        borderRadius: 0,
      }}
    >
      <Canvas
        camera={{ position: [2, 2, 2], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={L.ambientIntensity} />
        <directionalLight position={dir1Pos} intensity={L.directional1Intensity} />
        <directionalLight position={dir2Pos} intensity={L.directional2Intensity} />
        <Suspense fallback={<Fallback />}>
          <Model url={modelUrl} scale={scale} rotation={rotation} />
        </Suspense>
        <OrbitControls enablePan={false} enableZoom={false} enableRotate />
      </Canvas>
    </div>
  );
}
