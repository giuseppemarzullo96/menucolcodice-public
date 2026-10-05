import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Card, Button } from '@/components/admin';
import styles from '@/styles/admin.module.css';

type Props = {
  restaurantData?: any;
};

function menuQrUrl(restaurantData?: any) {
  const slug = String(restaurantData?.tenant?.slug || '').trim();
  if (slug) return `https://${slug}.menucolcodice.it/?src=qr`;
  if (typeof window !== 'undefined') return `${window.location.origin}/?src=qr`;
  return '';
}

function fileBase(restaurantData?: any) {
  const slug = String(restaurantData?.tenant?.slug || restaurantData?.name || 'menu')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'menu';
}

export const QrTab: React.FC<Props> = ({ restaurantData }) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(menuQrUrl(restaurantData));
  }, [restaurantData]);

  const downloadPng = async () => {
    if (!qrRef.current) return;
    setBusy('png');
    try {
      const canvas = await html2canvas(qrRef.current, { backgroundColor: '#ffffff', scale: 3 });
      const link = document.createElement('a');
      link.download = `${fileBase(restaurantData)}-qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setBusy('');
    }
  };

  const downloadPdf = async () => {
    if (!qrRef.current) return;
    setBusy('pdf');
    try {
      const canvas = await html2canvas(qrRef.current, { backgroundColor: '#ffffff', scale: 3 });
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const width = 90;
      const height = (canvas.height * width) / canvas.width;
      pdf.addImage(img, 'PNG', (210 - width) / 2, (297 - height) / 2, width, height);
      pdf.text(String(restaurantData?.name || 'Menu'), 105, (297 - height) / 2 - 8, { align: 'center' });
      pdf.save(`${fileBase(restaurantData)}-qr.pdf`);
    } finally {
      setBusy('');
    }
  };

  const copyUrl = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card title="QR del menu">
        <p className={styles.muted} style={{ marginBottom: '1.1rem' }}>
          Stampa questo codice e mettilo al tavolo. Chi lo inquadra apre il menu. Le scansioni di questo QR
          entrano in Statistiche.
        </p>
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div
            ref={qrRef}
            style={{
              background: '#ffffff',
              padding: '1.1rem',
              border: '1px solid #EFE9DC',
            }}
          >
            {url ? (
              <QRCodeSVG value={url} size={240} level="H" marginSize={4} fgColor="#1A1A17" bgColor="#ffffff" />
            ) : null}
          </div>
          <div className="space-y-3 min-w-0">
            <p className="text-sm font-semibold text-[#1A1A17] break-all">{url || '—'}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={downloadPng} loading={busy === 'png'} disabled={Boolean(busy)}>
                Scarica PNG
              </Button>
              <Button variant="secondary" onClick={downloadPdf} loading={busy === 'pdf'} disabled={Boolean(busy)}>
                Scarica PDF
              </Button>
              <Button variant="secondary" onClick={copyUrl} disabled={!url}>
                {copied ? 'Link copiato' : 'Copia link'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
