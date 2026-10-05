import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { dishes } from '../../../database/dishes';
import { tenantDataDir, withTenantApi } from '@/server/tenant';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const dishesJsonPath = path.join(tenantDataDir(), 'dishes.json');
    fs.writeFileSync(dishesJsonPath, JSON.stringify(dishes, null, 2), 'utf8');
    
    res.status(200).json({ message: 'dishes.json generato con successo!' });
  } catch (error) {
    console.error('Errore:', error);
    res.status(500).json({ message: 'Errore', error: String(error) });
  }
}

export default withTenantApi(handler);
