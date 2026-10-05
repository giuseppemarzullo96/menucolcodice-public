'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import styles from '@/styles/marketing.module.css';

const ModelViewer = dynamic(
  () => import('@/components/products/ModelViewer').then((m) => m.ModelViewer),
  {
    ssr: false,
    loading: () => <div className={styles.dish3dLoading}>Carico il piatto 3D…</div>,
  }
);

/** Pasta alle vongole già presente in public/uploads (Tripo), copiata in /models. */
const DISH_MODEL = '/models/piatto-demo.glb';

export function Dish3DPreview() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '120px', threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={styles.dish3dStage}>
      {visible ? (
        <ModelViewer
          modelUrl={DISH_MODEL}
          height={320}
          scale={1.35}
          rotation={[0.15, 0.4, 0]}
          transparentBackground
        />
      ) : (
        <div className={styles.dish3dLoading}>Gira il piatto col dito</div>
      )}
      <p className={styles.dish3dHint}>Trascina per girare · pasta alle vongole (demo)</p>
    </div>
  );
}
