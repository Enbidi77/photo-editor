import type { Metadata } from 'next';
import ThemeRegistry from '@/theme/ThemeRegistry';
import { AppProviders } from '@/components/providers/AppProviders';

export const metadata: Metadata = {
  title: 'PixelForge — Professional Web Image Editor',
  description: 'Production-quality desktop browser image editor inspired by Adobe Photoshop workflow',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
        <ThemeRegistry>
          <AppProviders>{children}</AppProviders>
        </ThemeRegistry>
      </body>
    </html>
  );
}
