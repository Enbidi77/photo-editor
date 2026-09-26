'use client';

import React, { useEffect, useRef } from 'react';
import { Upload, CheckCircle2, AlertCircle, X, RefreshCw } from 'lucide-react';
import { editorTokens } from '@/theme/palette';

export type DropzoneState = 'idle' | 'dragging' | 'confirming' | 'error';

interface DropzoneOverlayProps {
  state: DropzoneState;
  title?: string;
  subtitle?: string;
  confirmTitle?: string;
  confirmSubtitle?: string;
  errorMessage?: string;
  onRetry?: () => void;
  onDismissError?: () => void;
  fullScreen?: boolean;
  testId?: string;
}

export const DropzoneOverlay: React.FC<DropzoneOverlayProps> = ({
  state,
  title = 'Drop your image here',
  subtitle = 'Release to add as a new layer',
  confirmTitle = 'Image dropped!',
  confirmSubtitle = 'Importing image to canvas...',
  errorMessage = 'Unsupported file format. Please upload an image (PNG, JPG, WebP, SVG, GIF) or .pxf project.',
  onRetry,
  onDismissError,
  fullScreen = false,
  testId = 'dropzone-overlay',
}) => {
  const isVisible = state !== 'idle';
  const retryBtnRef = useRef<HTMLButtonElement | null>(null);

  // Focus retry button on error state for keyboard accessibility
  useEffect(() => {
    if (state === 'error' && retryBtnRef.current) {
      retryBtnRef.current.focus();
    }
  }, [state]);

  const isError = state === 'error';
  const isConfirming = state === 'confirming';
  const isDragging = state === 'dragging';

  // Dynamic colors based on state
  const accentColor = isError
    ? editorTokens.accent.danger
    : isConfirming
    ? editorTokens.accent.success
    : editorTokens.accent.primary;

  const glowShadow = isError
    ? '0 0 36px rgba(229, 83, 75, 0.4), inset 0 0 24px rgba(229, 83, 75, 0.12)'
    : isConfirming
    ? '0 0 36px rgba(63, 185, 80, 0.45), inset 0 0 24px rgba(63, 185, 80, 0.15)'
    : '0 0 40px rgba(0, 120, 212, 0.45), inset 0 0 28px rgba(0, 120, 212, 0.12)';

  const bgTint = isError
    ? 'rgba(229, 83, 75, 0.08)'
    : isConfirming
    ? 'rgba(63, 185, 80, 0.08)'
    : 'rgba(0, 120, 212, 0.09)';

  return (
    <>
      <style>{`
        @keyframes dropzoneDashMove {
          from {
            stroke-dashoffset: 0;
          }
          to {
            stroke-dashoffset: -32px;
          }
        }
        @keyframes dropzoneFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        @keyframes dropzoneSuccessPop {
          0% {
            transform: scale(0.85);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.12);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes dropzoneShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-2px); }
          80% { transform: translateX(2px); }
        }
        .dropzone-dash-stroke {
          animation: dropzoneDashMove 1s linear infinite;
        }
        .dropzone-icon-float {
          animation: dropzoneFloat 2.2s ease-in-out infinite;
        }
        .dropzone-success-pop {
          animation: dropzoneSuccessPop 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .dropzone-error-shake {
          animation: dropzoneShake 0.4s ease-in-out;
        }
      `}</style>

      {/* Screen reader live status announcements */}
      <div aria-live="polite" aria-atomic="true" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
        {isDragging && `${title}. ${subtitle}`}
        {isConfirming && `${confirmTitle}. ${confirmSubtitle}`}
        {isError && `Upload error: ${errorMessage}`}
      </div>

      <div
        data-testid={testId}
        role="region"
        aria-label="Image drop zone overlay"
        style={{
          position: fullScreen ? 'fixed' : 'absolute',
          inset: fullScreen ? 12 : 12,
          borderRadius: 14,
          backgroundColor: bgTint,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          zIndex: fullScreen ? 9999 : 100,
          pointerEvents: isError ? 'auto' : 'none',
          boxShadow: glowShadow,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'scale(1)' : 'scale(0.97)',
          transition: 'opacity 0.24s cubic-bezier(0.16, 1, 0.3, 1), transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        {/* Animated Dashed Border SVG */}
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            borderRadius: 14,
          }}
        >
          <rect
            x="2"
            y="2"
            width="calc(100% - 4px)"
            height="calc(100% - 4px)"
            rx="12"
            ry="12"
            fill="none"
            stroke={accentColor}
            strokeWidth="2.5"
            strokeDasharray="8 8"
            className="dropzone-dash-stroke"
          />
        </svg>

        {/* Content Box */}
        <div
          className={isConfirming ? 'dropzone-success-pop' : isError ? 'dropzone-error-shake' : ''}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 32px',
            maxWidth: 520,
            textAlign: 'center',
            gap: 14,
            zIndex: 2,
          }}
        >
          {/* Centered Icon with subtle pulse / animation */}
          <div
            className={isDragging ? 'dropzone-icon-float' : ''}
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              backgroundColor: `${accentColor}26`,
              border: `2px solid ${accentColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: accentColor,
              boxShadow: `0 0 20px ${accentColor}66`,
              transition: 'all 0.25s ease',
            }}
          >
            {isConfirming ? (
              <CheckCircle2 size={38} color={accentColor} strokeWidth={2.2} />
            ) : isError ? (
              <AlertCircle size={38} color={accentColor} strokeWidth={2.2} />
            ) : (
              <Upload size={36} color={accentColor} strokeWidth={2.2} />
            )}
          </div>

          {/* Text and Feedback Details */}
          <div>
            <div
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#ffffff',
                marginBottom: 6,
                letterSpacing: '0.01em',
                lineHeight: 1.3,
                textShadow: '0 2px 8px rgba(0,0,0,0.6)',
              }}
            >
              {isConfirming ? confirmTitle : isError ? 'Upload Problem' : title}
            </div>
            <div
              style={{
                fontSize: '0.88rem',
                color: isError ? '#ffb3b0' : '#e0e0e0',
                lineHeight: 1.45,
                textShadow: '0 1px 4px rgba(0,0,0,0.5)',
              }}
            >
              {isConfirming ? confirmSubtitle : isError ? errorMessage : subtitle}
            </div>
          </div>

          {/* Formats pill when dragging */}
          {isDragging && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 20,
                backgroundColor: 'rgba(0, 0, 0, 0.45)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                fontSize: '0.72rem',
                fontWeight: 500,
                color: '#cccccc',
                marginTop: 2,
              }}
            >
              <span>PNG, JPG, WebP, SVG, GIF, PXF</span>
            </div>
          )}

          {/* Error Actions: Retry & Dismiss */}
          {isError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginTop: 8,
              }}
            >
              {onRetry && (
                <button
                  ref={retryBtnRef}
                  type="button"
                  onClick={onRetry}
                  aria-label="Try again, choose file from device"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: 4,
                    backgroundColor: editorTokens.accent.primary,
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = editorTokens.accent.primaryHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = editorTokens.accent.primary;
                  }}
                >
                  <RefreshCw size={14} />
                  <span>Choose Another File</span>
                </button>
              )}

              {onDismissError && (
                <button
                  type="button"
                  onClick={onDismissError}
                  aria-label="Dismiss error message"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '8px 14px',
                    borderRadius: 4,
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    color: '#e2e2e2',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    fontWeight: 500,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
                  }}
                >
                  <X size={14} />
                  <span>Dismiss</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
