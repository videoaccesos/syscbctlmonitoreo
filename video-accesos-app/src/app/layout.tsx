import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Video Accesos - AccesPhone',
  description: 'Softphone SIP/WebRTC para control de accesos',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
