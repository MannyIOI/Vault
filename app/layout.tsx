import type { Metadata, Viewport } from 'next';
import '../src/index.css';

export const metadata: Metadata = {
  title: 'Vault Inventory Management',
  description: 'Vault — inventory, sales, and treasury for retail.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#0D1C32',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
