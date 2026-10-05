import type { NextApiRequest, NextApiResponse } from 'next';
import { tenantSslMarkerReady, verifyTenantHttps } from '@/server/provisionHost';
import { getTenantBySlug, isValidSlug } from '@/server/tenant';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  const slug = String(req.query.slug || '').toLowerCase().trim();
  if (!isValidSlug(slug)) return res.status(400).json({ ready: false, message: 'Sottodominio non valido' });
  const tenant = getTenantBySlug(slug);
  const marker = tenantSslMarkerReady(slug);
  const httpsOk = marker ? await verifyTenantHttps(slug) : false;
  const ready = Boolean(tenant) && marker && httpsOk;
  return res.status(200).json({
    exists: Boolean(tenant),
    marker,
    httpsOk,
    ready,
    admin: `https://${slug}.menucolcodice.it/admin/login`,
    url: `https://${slug}.menucolcodice.it`,
  });
}
