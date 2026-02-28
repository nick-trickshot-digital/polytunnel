import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navigation } from '@/components/ui/Navigation';
import { ToastProvider } from '@/components/ui/Toast';
import { LOCATION_NAME } from '@/lib/config';

export const metadata: Metadata = {
  title: "Ant's Polytunnel",
  description: `Smart growing assistant for your polytunnel in ${LOCATION_NAME}`,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#2E8C37',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;0,9..144,800;0,9..144,900;1,9..144,400;1,9..144,600&family=Nunito:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-earth-50">
        <ToastProvider>
          <main className="pb-24 md:pb-0 md:pl-72">
            {children}
          </main>
          <Navigation />
        </ToastProvider>
      </body>
    </html>
  );
}
