import type { NextApiRequest, NextApiResponse } from 'next';
import { isAdminAuthenticated } from '@/server/auth';
import { loadIntegrations, saveIntegrations, maskKey } from '@/server/integrations';
import { isPlatformHost, withTenantApi } from '@/server/tenant';

function cleanGa4(value: string) {
  const id = String(value || '').trim().toUpperCase();
  if (!id) return '';
  if (!/^G-[A-Z0-9]{4,20}$/.test(id)) return null;
  return id;
}

function cleanVerification(value: string) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.length > 120 || /[<>]/.test(text)) return null;
  return text;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isAdminAuthenticated(req) || !isPlatformHost()) {
    return res.status(401).json({ message: 'Non autenticato' });
  }

  if (req.method === 'GET') {
    const google = loadIntegrations().google;
    return res.status(200).json({
      ga4MeasurementId: google.ga4MeasurementId || '',
      searchConsoleVerification: google.searchConsoleVerification || '',
      placesApiKey: {
        hasApiKey: Boolean(google.places.apiKey),
        apiKeyMasked: maskKey(google.places.apiKey),
      },
    });
  }

  if (req.method === 'POST') {
    const current = loadIntegrations();
    const ga4 = cleanGa4(req.body?.ga4MeasurementId ?? current.google.ga4MeasurementId);
    const gsc = cleanVerification(
      req.body?.searchConsoleVerification ?? current.google.searchConsoleVerification
    );
    if (ga4 === null) {
      return res.status(400).json({ message: 'ID Analytics non valido. Deve essere tipo G-XXXXXXXX.' });
    }
    if (gsc === null) {
      return res.status(400).json({ message: 'Codice Search Console non valido.' });
    }
    const placesApiKey = String(req.body?.placesApiKey || '').trim() || current.google.places.apiKey;
    saveIntegrations({
      ...current,
      google: {
        ga4MeasurementId: ga4,
        searchConsoleVerification: gsc,
        places: { apiKey: placesApiKey },
      },
    });
    return res.status(200).json({ message: 'Google salvato' });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default withTenantApi(handler);
