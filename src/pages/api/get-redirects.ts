import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { tenantDataDir, withTenantApi } from '@/server/tenant';

interface Redirect {
  id: string;
  from: string;
  to: string;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const redirectsPath = path.join(tenantDataDir(), 'redirects.json');
    
    let redirects: Redirect[] = [];
    
    if (fs.existsSync(redirectsPath)) {
      const content = fs.readFileSync(redirectsPath, 'utf8');
      redirects = JSON.parse(content);
    }

    res.status(200).json({ redirects });
  } catch (error) {
    console.error('Errore nel leggere i redirect:', error);
    res.status(500).json({ message: 'Errore nel leggere i redirect', error: String(error) });
  }
}

export default withTenantApi(handler);
