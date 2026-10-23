import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PlayerProvider } from '@/context/PlayerContext';
import { Navigation } from '@/components/Navigation';
import { MiniPlayer } from '@/components/MiniPlayer';
import { NowPlayingExpanded } from '@/components/NowPlayingExpanded';

export const metadata: Metadata = {
  title: 'WhenVanshListens — Distinctive Listening Space',
  description: 'Your music, your journey. Personal listening space and Sound Atlas web player.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
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
    <html lang="en" className="dark bg-black">
      <body className="bg-black text-white min-h-screen flex flex-col md:flex-row antialiased select-none">
        <PlayerProvider>
          {/* Sidebar / Bottom Navigation */}
          <Navigation />

          {/* Main Route Content */}
          <div className="flex-1 flex flex-col min-w-0 pb-36 md:pb-28">
            {children}
          </div>

          {/* Persistent Mini Player */}
          <MiniPlayer />

          {/* Expanded Now Playing Listening Space */}
          <NowPlayingExpanded />
        </PlayerProvider>
      </body>
    </html>
  );
}
