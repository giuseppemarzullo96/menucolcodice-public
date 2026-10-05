import fs from 'fs';
import path from 'path';
import { tenantDataDir } from './tenant';
import type { MenuProduct } from './menuStore';
import { deleteProduct, saveProducts, loadProducts, updateProduct } from './menuStore';

export type UndoEntry =
  | { type: 'delete'; products: MenuProduct[]; at: number }
  | { type: 'price'; id: string; previousPrice: number; name: string; at: number }
  | { type: 'soldOut'; id: string; previousUntil: number | null | undefined; name: string; at: number }
  | { type: 'update'; previous: MenuProduct; at: number }
  | { type: 'bulkUpdate'; previous: MenuProduct[]; at: number }
  | { type: 'add'; ids: string[]; at: number }
  | { type: 'bulkPrice'; previous: Array<{ id: string; price: number }>; at: number };

const UNDO_MS = 6 * 60 * 60 * 1000;

function undoPath() {
  return path.join(tenantDataDir(), 'whatsapp-undo.json');
}

export function pushUndo(entry: UndoEntry) {
  fs.writeFileSync(undoPath(), JSON.stringify(entry, null, 2), 'utf8');
}

export function peekUndo(): UndoEntry | null {
  if (!fs.existsSync(undoPath())) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(undoPath(), 'utf8')) as UndoEntry;
    if (!raw || Date.now() - (raw.at || 0) > UNDO_MS) return null;
    return raw;
  } catch {
    return null;
  }
}

export function clearUndo() {
  try {
    if (fs.existsSync(undoPath())) fs.unlinkSync(undoPath());
  } catch {
    /* ignore */
  }
}

export function applyUndo(): { ok: true; message: string } | { ok: false; message: string } {
  const entry = peekUndo();
  if (!entry) {
    return { ok: false, message: 'Non c’è nulla da annullare. L’ultima modifica è troppo vecchia o non c’è.' };
  }
  clearUndo();

  if (entry.type === 'delete') {
    const products = loadProducts();
    const byId = new Set(products.map((p) => p.id));
    const restored = entry.products.filter((p) => !byId.has(p.id));
    if (!restored.length) {
      return { ok: false, message: 'Quei piatti sono già di nuovo nel menu.' };
    }
    saveProducts([...products, ...restored]);
    const names = restored.map((p) => `*${p.name}*`).join(', ');
    return { ok: true, message: `Ho rimesso ${names} come prima.` };
  }

  if (entry.type === 'price') {
    updateProduct(entry.id, { price: entry.previousPrice });
    return {
      ok: true,
      message: `Ho rimesso *${entry.name}* come era: €${Number(entry.previousPrice).toFixed(2)}.`,
    };
  }

  if (entry.type === 'soldOut') {
    updateProduct(entry.id, { soldOutUntil: entry.previousUntil ?? null });
    const wasOut = entry.previousUntil === 0 || (entry.previousUntil != null && entry.previousUntil > Date.now());
    return {
      ok: true,
      message: wasOut
        ? `*${entry.name}* è di nuovo segnato come finito.`
        : `*${entry.name}* è di nuovo disponibile.`,
    };
  }

  if (entry.type === 'update') {
    const products = loadProducts().map((p) => (p.id === entry.previous.id ? entry.previous : p));
    saveProducts(products);
    return { ok: true, message: `Ho rimesso *${entry.previous.name}* come era.` };
  }

  if (entry.type === 'bulkUpdate') {
    const byId = new Map(entry.previous.map((p) => [p.id, p]));
    const products = loadProducts().map((p) => byId.get(p.id) || p);
    saveProducts(products);
    const names = entry.previous.map((p) => `*${p.name}*`).join(', ');
    return { ok: true, message: `Ho rimesso come prima: ${names}.` };
  }

  if (entry.type === 'add') {
    for (const id of entry.ids) deleteProduct(id);
    return { ok: true, message: 'Ho tolto il piatto appena aggiunto.' };
  }

  if (entry.type === 'bulkPrice') {
    const map = new Map(entry.previous.map((row) => [row.id, row.price]));
    const products = loadProducts().map((p) => (map.has(p.id) ? { ...p, price: map.get(p.id)! } : p));
    saveProducts(products);
    return { ok: true, message: `Ho ripristinato i prezzi di ${entry.previous.length} piatti.` };
  }

  return { ok: false, message: 'Non riesco ad annullare questa modifica.' };
}
