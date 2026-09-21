'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const EditorShell = dynamic(
  () => import('@/components/layout/EditorShell').then((mod) => mod.EditorShell),
  { ssr: false }
);

export default function EditorPage() {
  return <EditorShell />;
}
