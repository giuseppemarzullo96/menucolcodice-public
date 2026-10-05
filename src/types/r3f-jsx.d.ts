/**
 * Estende JSX per gli elementi di @react-three/fiber
 */
import 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      primitive: { object: unknown; scale?: number; rotation?: [number, number, number] };
      mesh: Record<string, unknown>;
      boxGeometry: Record<string, unknown>;
      meshStandardMaterial: Record<string, unknown>;
      ambientLight: Record<string, unknown>;
      directionalLight: Record<string, unknown>;
    }
  }
}
