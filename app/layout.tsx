import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cellule Pastef quartiers: S.M.SY 1/ D.S.2.E — Gestion Don de Sang & Podium',
  description: 'Plateforme interne légère de gestion de la journée de distribution de moustiquaires',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
