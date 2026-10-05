import type { NextApiRequest, NextApiResponse } from 'next';
import { COMPANY } from '@/seo/company';

function vcardLine(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,');
}

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const tel = `+${COMPANY.whatsappE164}`;
  const name = COMPANY.productName;
  const body = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:;${vcardLine(name)};;;`,
    `FN:${vcardLine(name)}`,
    `ORG:${vcardLine(name)}`,
    `TEL;TYPE=CELL,VOICE,PREF:${tel}`,
    `TEL;TYPE=WORK,VOICE:${tel}`,
    `EMAIL;TYPE=INTERNET:${COMPANY.email}`,
    `URL:${COMPANY.website}`,
    `item1.URL:https://wa.me/${COMPANY.whatsappE164}`,
    'item1.X-ABLabel:WhatsApp',
    'END:VCARD',
  ].join('\r\n');

  res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename="Menu col codice.vcf"');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(body);
}
