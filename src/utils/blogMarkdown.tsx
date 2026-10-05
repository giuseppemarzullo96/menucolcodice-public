import React from 'react';

/**
 * Renderer minimale per il markdown semplice generato dal blog: paragrafi
 * separati da riga vuota, "## " per i sottotitoli, "**testo**" per il grassetto.
 * Nessuna dipendenza esterna: il formato è volutamente limitato a quello che il
 * generatore AI produce (vedi blogGenerator.ts).
 */

function headingId(text: string, index: number) {
  const slug = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug ? `${slug}-${index}` : `sezione-${index}`;
}

/** Titoli delle sezioni (## ) del corpo, con l'id usato dal renderer, per il sommario. */
export function extractHeadings(body: string): { id: string; text: string }[] {
  const blocks = String(body || '')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  const headings: { id: string; text: string }[] = [];
  blocks.forEach((block, index) => {
    if (block.startsWith('## ') || block.startsWith('# ')) {
      const text = block.replace(/^#{1,2}\s+/, '').trim();
      headings.push({ id: headingId(text, index), text });
    }
  });
  return headings;
}

export function renderBlogBody(body: string): React.ReactNode[] {
  const blocks = String(body || '')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map((block, index) => {
    if (block.startsWith('## ')) {
      const text = block.slice(3).trim();
      return (
        <h2 key={index} id={headingId(text, index)}>
          {renderInline(text)}
        </h2>
      );
    }
    if (block.startsWith('# ')) {
      const text = block.slice(2).trim();
      return (
        <h2 key={index} id={headingId(text, index)}>
          {renderInline(text)}
        </h2>
      );
    }
    return <p key={index}>{renderInline(block)}</p>;
  });
}

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
