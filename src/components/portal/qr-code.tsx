'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

// Renders a scannable QR code for a URL (e.g. the customer payment portal link).
// Uses the pure-JS `qrcode` package so it works fully offline (no external API),
// which is important for the Electron desktop build. `qrcode` is declared in
// package.json — run `npm install` to fetch it.
export function QrCode({ value, size = 160 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setDataUrl('');
    setError(false);
    if (!value) return;
    QRCode.toDataURL(value, { width: size, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [value, size]);

  if (error) return <p className="text-xs text-destructive">خطا در تولید کد QR</p>;
  if (!dataUrl)
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-md bg-muted animate-pulse"
      />
    );

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="border rounded-md p-2 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} alt="QR Code" width={size} height={size} className="block" />
      </div>
      <p className="text-xs text-muted-foreground text-center break-all max-w-[220px]">{value}</p>
    </div>
  );
}
