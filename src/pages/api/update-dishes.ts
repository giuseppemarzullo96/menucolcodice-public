import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { tenantDataDir, withTenantApi } from '@/server/tenant';

function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const dishesPath = path.join(tenantDataDir(), 'dishes.ts');
    const newContent = req.body.content;

    // Backup del file originale
    const backupPath = path.join(tenantDataDir(), `dishes.backup.${Date.now()}.ts`);
    fs.copyFileSync(dishesPath, backupPath);

    // Scrivi il nuovo contenuto
    fs.writeFileSync(dishesPath, newContent, 'utf8');

    res.status(200).json({ message: 'Dishes updated successfully' });
  } catch (error) {
    console.error('Error updating dishes:', error);
    res.status(500).json({ message: 'Error updating dishes' });
  }
}

export default withTenantApi(handler);
