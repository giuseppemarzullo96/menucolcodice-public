import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { tenantDataDir, withTenantApi } from '@/server/tenant';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Leggi il file dishes.ts e valutalo
    const dishesPath = path.join(tenantDataDir(), 'dishes.ts');
    const dishesContent = fs.readFileSync(dishesPath, 'utf8');
    
    // Invece di importare, leggi il file e restituisci i dati
    // Per ora restituiamo un segnale che il file è cambiato
    const stats = fs.statSync(dishesPath);
    
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.status(200).json({ 
      updated: stats.mtime,
      message: 'File updated'
    });
  } catch (error) {
    console.error('Errore:', error);
    res.status(500).json({ message: 'Errore', error: String(error) });
  }
}

export default withTenantApi(handler);
