import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { sanitizeSocial } from './socialLinks';
import { tenantDataDir } from '@/server/tenant';

// Cache in-memory per i dati letti
const dataCache = new Map<string, { data: any; mtime: number }>();

// Funzione per ottenere il tempo di modifica di un file
const getFileMtime = (filePath: string): number => {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return 0;
  }
};

// Funzione per leggere e parsare un modulo TypeScript con cache
export const readModule = (filePath: string, exportName: string) => {
  if (!fs.existsSync(filePath)) return null;

  // Controlla se il file è in cache e se è ancora valido
  const cacheKey = `${filePath}:${exportName}`;
  const cached = dataCache.get(cacheKey);
  const currentMtime = getFileMtime(filePath);

  // Se il file è in cache e non è stato modificato, restituisci i dati cached
  if (cached && cached.mtime === currentMtime) {
    return cached.data;
  }

  try {
    const tsContent = fs.readFileSync(filePath, 'utf8');
    let jsContent = tsContent
      .replace(/^[ \t]*import[^;]+;\s*\n/gm, '')
      .replace(new RegExp(`export\\s+const\\s+${exportName}\\s*[:=]\\s*`), `exports.${exportName} = `)
      .replace(/PriceNameType\.([A-Z_]+)/g, '"$1"');
    
    // Rimuove tutte le type assertion (as "type" | "type2" | ...)
    // Approccio semplice e robusto: rimuove tutto da "as" fino alla virgola successiva
    // Funziona con qualsiasi pattern di type assertion
    // Pattern: spazio + "as" + qualsiasi carattere (non-greedy) fino alla virgola
    jsContent = jsContent.replace(/\s+as\s+[^,]+(?=,)/g, '');
    const sandbox: any = { exports: {} };
    vm.createContext(sandbox);
    vm.runInContext(jsContent, sandbox, { filename: filePath });
    const result = sandbox.exports[exportName];

    // Salva in cache
    dataCache.set(cacheKey, { data: result, mtime: currentMtime });

    return result;
  } catch (e) {
    console.warn(`Errore nel leggere ${filePath}:`, e);
    return null;
  }
};

// Funzione per invalidare la cache (utile quando i file vengono modificati)
export const invalidateCache = (filePath?: string) => {
  if (filePath) {
    // Invalida solo i file che corrispondono al pattern
    const keysToDelete: string[] = [];
    Array.from(dataCache.keys()).forEach(key => {
      if (key.startsWith(filePath)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => dataCache.delete(key));
  } else {
    // Invalida tutta la cache
    dataCache.clear();
  }
};

// Funzione helper per caricare tutti i dati del ristorante
export const loadRestaurantData = () => {
  const basePath = tenantDataDir();
  
  return {
    restaurantInfo: readModule(path.join(basePath, 'restaurant', 'info.ts'), 'restaurantInfo') || {},
    restaurantContacts: readModule(path.join(basePath, 'restaurant', 'contacts.ts'), 'restaurantContacts') || {},
    restaurantSocial: sanitizeSocial(readModule(path.join(basePath, 'restaurant', 'social.ts'), 'restaurantSocial') || {}),
    themeLayout: readModule(path.join(basePath, 'theme', 'layout.ts'), 'themeLayout') || {},
    themeColors: readModule(path.join(basePath, 'theme', 'colors.ts'), 'themeColors') || {},
    menuSections: readModule(path.join(basePath, 'menu', 'sections.ts'), 'menuSections') || [],
    menuProducts: readModule(path.join(basePath, 'menu', 'products.ts'), 'menuProducts') || [],
  };
};
