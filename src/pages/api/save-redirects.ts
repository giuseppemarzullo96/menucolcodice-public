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
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { redirects } = req.body;
    
    if (!Array.isArray(redirects)) {
      return res.status(400).json({ message: 'redirects deve essere un array' });
    }

    // Valida i redirect
    for (const redirect of redirects) {
      if (!redirect.from || !redirect.to) {
        return res.status(400).json({ message: 'Ogni redirect deve avere from e to' });
      }
      
      // Normalizza from: rimuovi slash iniziale se presente, ma mantieni il path
      redirect.from = redirect.from.trim();
      if (redirect.from.startsWith('/')) {
        redirect.from = redirect.from.substring(1);
      }
      
      // Normalizza to: assicurati che inizi con / se è un path relativo
      redirect.to = redirect.to.trim();
      if (!redirect.to.startsWith('http://') && !redirect.to.startsWith('https://') && !redirect.to.startsWith('/')) {
        redirect.to = '/' + redirect.to;
      }
    }

    const redirectsPath = path.join(tenantDataDir(), 'redirects.json');
    const databaseDir = path.dirname(redirectsPath);
    
    // Crea la directory se non esiste
    if (!fs.existsSync(databaseDir)) {
      fs.mkdirSync(databaseDir, { recursive: true });
    }

    // Scrivi il file
    fs.writeFileSync(redirectsPath, JSON.stringify(redirects, null, 2), 'utf8');
    
    // Forza il flush del filesystem
    const fd = fs.openSync(redirectsPath, 'r+');
    fs.fsyncSync(fd);
    fs.closeSync(fd);

    console.log('File redirects.json aggiornato con successo');
    res.status(200).json({ message: 'Redirect salvati con successo!' });
  } catch (error) {
    console.error('Errore nel salvare i redirect:', error);
    res.status(500).json({ message: 'Errore nel salvare i redirect', error: String(error) });
  }
}

export default withTenantApi(handler);
