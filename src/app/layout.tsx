import type { Metadata, Viewport } from 'next';
import { Toaster } from "@/components/ui/toaster";
import PWA from "@/components/pwa";
import './globals.css';

export const metadata: Metadata = {
  title: 'مدیریت بوفه باشگاه',
  description: 'بوفه باشگاه خود را به راحتی مدیریت کنید.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700&family=Source+Code+Pro:ital,wght@0,200..900;1,200..900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <PWA />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
