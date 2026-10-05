import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';
import { withTenantApi } from '@/server/tenant';

const execPromise = promisify(exec);

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    res.status(200).json({ message: 'Ricompilazione avviata in background' });
    
    // Esegui la build e restart in background
    setTimeout(async () => {
      try {
        console.log('Avvio build...');
        await execPromise('cd /var/www/vhosts/demo.menucolcodice.it/httpdocs && npm run build');
        console.log('Build completata, riavvio PM2...');
        await execPromise('pm2 restart menucolcodice-restaurant-menu');
        console.log('Riavvio completato!');
      } catch (error) {
        console.error('Errore durante rebuild:', error);
      }
    }, 100);
    
  } catch (error) {
    console.error('Errore:', error);
    res.status(500).json({ message: 'Errore', error: String(error) });
  }
}

export default withTenantApi(handler);
