'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useDocumentStore } from '@/store/documentStore';
import { useLayerStore } from '@/store/layerStore';
import { StartScreen } from '@/components/home/StartScreen';

// Dynamically import EditorShell with ssr: false to prevent canvas hydration mismatches
const EditorShell = dynamic(
  () => import('@/components/layout/EditorShell').then((mod) => mod.EditorShell),
  { ssr: false }
);

export default function HomePage() {
  const { document: doc } = useDocumentStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: '#181818',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#888888',
          fontFamily: 'sans-serif',
          fontSize: '0.85rem',
        }}
      >
        Loading PixelForge...
      </div>
    );
  }

  if (!doc) {
    return <StartScreen onOpenEditor={() => {}} />;
  }

  return <EditorShell />;
}
