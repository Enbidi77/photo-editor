'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { useViewStore } from '@/store/viewStore';
import { editorTokens } from '@/theme/palette';

interface RulersProps {
  viewportWidth: number;
  viewportHeight: number;
  docX: number; // document top-left X in viewport coordinates
  docY: number; // document top-left Y in viewport coordinates
  cursorX: number; // mouse X in document coordinates
  cursorY: number; // mouse Y in document coordinates
  onAddGuide?: (orientation: 'horizontal' | 'vertical', position: number) => void;
}

const RULER_SIZE = 20;

export const Rulers: React.FC<RulersProps> = ({
  viewportWidth,
  viewportHeight,
  docX,
  docY,
  cursorX,
  cursorY,
  onAddGuide,
}) => {
  const horizontalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const verticalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const { zoom, showRulers } = useViewStore();

  const getTickStep = (currentZoom: number) => {
    if (currentZoom >= 4) return { major: 25, minor: 5 };
    if (currentZoom >= 2) return { major: 50, minor: 10 };
    if (currentZoom >= 0.8) return { major: 100, minor: 20 };
    if (currentZoom >= 0.4) return { major: 200, minor: 50 };
    if (currentZoom >= 0.2) return { major: 500, minor: 100 };
    return { major: 1000, minor: 200 };
  };

  // Draw Horizontal Ruler
  useEffect(() => {
    if (!showRulers) return;
    const canvas = horizontalCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = viewportWidth;
    const height = RULER_SIZE;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = editorTokens.bg.panelHeader;
    ctx.fillRect(0, 0, width, height);

    // Border bottom
    ctx.strokeStyle = editorTokens.border.subtle;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height - 0.5);
    ctx.lineTo(width, height - 0.5);
    ctx.stroke();

    const { major, minor } = getTickStep(zoom);

    // Calculate start & end in doc coordinates
    const startDocX = -docX / zoom;
    const endDocX = (width - docX) / zoom;
    const firstMajor = Math.floor(startDocX / major) * major;

    ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = editorTokens.text.secondary;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    for (let pos = firstMajor; pos <= endDocX; pos += minor) {
      const screenX = docX + pos * zoom;
      if (screenX < 0 || screenX > width) continue;

      const isMajor = Math.abs(pos % major) < 0.001;
      const tickH = isMajor ? 12 : 5;

      ctx.strokeStyle = isMajor ? editorTokens.text.secondary : editorTokens.border.medium;
      ctx.beginPath();
      ctx.moveTo(screenX + 0.5, height - tickH);
      ctx.lineTo(screenX + 0.5, height);
      ctx.stroke();

      if (isMajor && pos !== 0) {
        ctx.fillText(Math.round(pos).toString(), screenX + 3, 2);
      } else if (isMajor && pos === 0) {
        ctx.fillStyle = editorTokens.accent.primary;
        ctx.fillText('0', screenX + 3, 2);
        ctx.fillStyle = editorTokens.text.secondary;
      }
    }

    // Cursor indicator
    const cursorScreenX = docX + cursorX * zoom;
    if (cursorScreenX >= 0 && cursorScreenX <= width) {
      ctx.strokeStyle = editorTokens.accent.primary;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cursorScreenX + 0.5, 0);
      ctx.lineTo(cursorScreenX + 0.5, height);
      ctx.stroke();
    }
  }, [viewportWidth, docX, zoom, cursorX, showRulers]);

  // Draw Vertical Ruler
  useEffect(() => {
    if (!showRulers) return;
    const canvas = verticalCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = RULER_SIZE;
    const height = viewportHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = editorTokens.bg.panelHeader;
    ctx.fillRect(0, 0, width, height);

    // Border right
    ctx.strokeStyle = editorTokens.border.subtle;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width - 0.5, 0);
    ctx.lineTo(width - 0.5, height);
    ctx.stroke();

    const { major, minor } = getTickStep(zoom);

    const startDocY = -docY / zoom;
    const endDocY = (height - docY) / zoom;
    const firstMajor = Math.floor(startDocY / major) * major;

    ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = editorTokens.text.secondary;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    for (let pos = firstMajor; pos <= endDocY; pos += minor) {
      const screenY = docY + pos * zoom;
      if (screenY < 0 || screenY > height) continue;

      const isMajor = Math.abs(pos % major) < 0.001;
      const tickW = isMajor ? 12 : 5;

      ctx.strokeStyle = isMajor ? editorTokens.text.secondary : editorTokens.border.medium;
      ctx.beginPath();
      ctx.moveTo(width - tickW, screenY + 0.5);
      ctx.lineTo(width, screenY + 0.5);
      ctx.stroke();

      if (isMajor && pos !== 0) {
        ctx.save();
        ctx.translate(2, screenY + 12);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(Math.round(pos).toString(), 0, 0);
        ctx.restore();
      } else if (isMajor && pos === 0) {
        ctx.save();
        ctx.translate(2, screenY + 12);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = editorTokens.accent.primary;
        ctx.fillText('0', 0, 0);
        ctx.restore();
      }
    }

    // Cursor indicator
    const cursorScreenY = docY + cursorY * zoom;
    if (cursorScreenY >= 0 && cursorScreenY <= height) {
      ctx.strokeStyle = editorTokens.accent.primary;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, cursorScreenY + 0.5);
      ctx.lineTo(width, cursorScreenY + 0.5);
      ctx.stroke();
    }
  }, [viewportHeight, docY, zoom, cursorY, showRulers]);

  const handleHorizontalMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!onAddGuide) return;
      const startClientY = e.clientY;
      const onMove = (moveEv: MouseEvent) => {
        // Dragging down from ruler
      };
      const onUp = (upEv: MouseEvent) => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        const finalY = (upEv.clientY - docY) / zoom;
        onAddGuide('horizontal', Math.round(finalY));
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [docY, zoom, onAddGuide]
  );

  const handleVerticalMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!onAddGuide) return;
      const onUp = (upEv: MouseEvent) => {
        window.removeEventListener('mouseup', onUp);
        const finalX = (upEv.clientX - docX) / zoom;
        onAddGuide('vertical', Math.round(finalX));
      };
      window.addEventListener('mouseup', onUp);
    },
    [docX, zoom, onAddGuide]
  );

  if (!showRulers) return null;

  return (
    <>
      {/* Top Left Corner Junction */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: RULER_SIZE,
          height: RULER_SIZE,
          backgroundColor: editorTokens.bg.panelHeader,
          borderRight: `1px solid ${editorTokens.border.subtle}`,
          borderBottom: `1px solid ${editorTokens.border.subtle}`,
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '9px',
          color: editorTokens.text.muted,
          fontFamily: 'monospace',
          userSelect: 'none',
        }}
      >
        px
      </div>

      {/* Horizontal Top Ruler */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: RULER_SIZE,
          right: 0,
          height: RULER_SIZE,
          zIndex: 25,
          cursor: 'ns-resize',
          overflow: 'hidden',
        }}
        onMouseDown={handleHorizontalMouseDown}
        title="Drag down to create a Horizontal Guide"
      >
        <canvas
          ref={horizontalCanvasRef}
          style={{ width: '100%', height: `${RULER_SIZE}px`, display: 'block' }}
        />
      </div>

      {/* Vertical Left Ruler */}
      <div
        style={{
          position: 'absolute',
          top: RULER_SIZE,
          left: 0,
          bottom: 0,
          width: RULER_SIZE,
          zIndex: 25,
          cursor: 'ew-resize',
          overflow: 'hidden',
        }}
        onMouseDown={handleVerticalMouseDown}
        title="Drag right to create a Vertical Guide"
      >
        <canvas
          ref={verticalCanvasRef}
          style={{ width: `${RULER_SIZE}px`, height: '100%', display: 'block' }}
        />
      </div>
    </>
  );
};
