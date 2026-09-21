'use client';

import React from 'react';
import { useUIStore } from '@/store/uiStore';
import { editorTokens } from '@/theme/palette';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastNotification: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 30,
        right: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        const borderColor = isSuccess
          ? editorTokens.accent.success
          : isError
          ? editorTokens.accent.danger
          : isWarning
          ? editorTokens.accent.warning
          : editorTokens.border.medium;

        return (
          <div
            key={toast.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: editorTokens.bg.surface,
              border: `1px solid ${borderColor}`,
              boxShadow: editorTokens.shadow.menu,
              padding: '6px 12px',
              borderRadius: 3,
              fontSize: '0.75rem',
              color: '#ffffff',
              minWidth: 200,
              maxWidth: 360,
              pointerEvents: 'auto',
              animation: 'slideUp 0.15s ease-out',
            }}
          >
            {isSuccess && <CheckCircle2 size={15} color={editorTokens.accent.success} />}
            {isError && <AlertCircle size={15} color={editorTokens.accent.danger} />}
            {!isSuccess && !isError && <Info size={15} color={editorTokens.accent.primary} />}

            <span style={{ flex: 1 }}>{toast.message}</span>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: editorTokens.text.muted,
                cursor: 'pointer',
                padding: 2,
                display: 'flex',
              }}
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
