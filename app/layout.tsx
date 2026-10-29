import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pastef keur Massar nord — Gestion Don de Sang & Podium',
  description: 'Application de gestion de la distribution de moustiquaires - Pastef keur Massar nord',
  manifest: '/manifest.json',
  themeColor: '#006837',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Pastef KMN',
  },
  icons: {
    icon: '/pastef-logo.png',
    apple: '/pastef-logo.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#006837',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="antialiased min-h-screen bg-slate-100/80">
        {children}
      </body>
    </html>
  );
}
