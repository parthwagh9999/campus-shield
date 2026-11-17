import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CampusShield — University Security Panel',
  description: 'Zero-knowledge real-time campus safety and emergency dispatch dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="bg-slate-950 text-slate-100 antialiased h-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}
