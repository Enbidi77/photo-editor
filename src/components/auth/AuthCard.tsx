'use client';

import React from 'react';
import { editorTokens } from '@/theme/palette';
import Link from 'next/link';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const AuthCard: React.FC<AuthCardProps> = ({ title, subtitle, children, footer }) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: editorTokens.bg.app,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        boxSizing: 'border-box',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          backgroundColor: editorTokens.bg.panel,
          border: `1px solid ${editorTokens.border.subtle}`,
          borderRadius: 4,
          boxShadow: editorTokens.shadow.menu,
          padding: '28px 24px',
          boxSizing: 'border-box',
        }}
      >
        {/* Brand Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                backgroundColor: editorTokens.accent.primary,
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '14px',
                fontFamily: 'monospace',
              }}
            >
              Pf
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.02em', color: '#ffffff' }}>
              PixelForge
            </span>
          </div>

          <div style={{ fontSize: '1rem', fontWeight: 600, color: editorTokens.text.primary, marginBottom: 4 }}>
            {title}
          </div>
          <div style={{ fontSize: '0.75rem', color: editorTokens.text.secondary, textAlign: 'center' }}>
            {subtitle}
          </div>
        </div>

        {/* Card Content */}
        {children}

        {/* Optional Footer */}
        {footer && (
          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: `1px solid ${editorTokens.border.subtle}`,
              fontSize: '0.72rem',
              color: editorTokens.text.secondary,
              textAlign: 'center',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
