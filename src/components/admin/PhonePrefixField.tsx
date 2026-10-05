import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/admin/Button';
import styles from '@/styles/admin.module.css';
import {
  countriesForPicker,
  countryByIso,
  parseStoredWhatsapp,
  composeWhatsapp,
} from '@/utils/countryCallingCodes';

function Flag({ iso }: { iso: string }) {
  return (
    <img
      alt=""
      width={20}
      height={15}
      className="inline-block align-middle mr-1"
      src={`https://flagcdn.com/w40/${iso.toLowerCase()}.png`}
    />
  );
}

type PhonePrefixFieldProps = {
  storedNumber?: string;
  onSave: (e164: string) => void;
  saving?: boolean;
};

export const PhonePrefixField: React.FC<PhonePrefixFieldProps> = ({ storedNumber, onSave, saving }) => {
  const parsed = parseStoredWhatsapp(storedNumber || '');
  const [iso, setIso] = useState(parsed.iso);
  const [national, setNational] = useState(parsed.national);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const countries = useMemo(() => countriesForPicker(), []);
  const selected = countryByIso(iso);

  useEffect(() => {
    const next = parseStoredWhatsapp(storedNumber || '');
    setIso(next.iso);
    setNational(next.national);
  }, [storedNumber]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const onClick = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const filtered = countries.filter((row) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      row.name.toLowerCase().includes(q) ||
      row.dial.includes(q.replace(/^\+/, '')) ||
      row.iso.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <label className={styles.label}>Tuo numero WhatsApp</label>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-1 gap-2 min-w-0">
          <div className="relative shrink-0" ref={boxRef}>
            <button
              type="button"
              className={`${styles.control} inline-flex items-center justify-between gap-2 w-[8.5rem]`}
              aria-haspopup="listbox"
              aria-expanded={open}
              onClick={() => {
                setQuery('');
                setOpen((prev) => !prev);
              }}
            >
              <span className="inline-flex items-center">
                <Flag iso={selected.iso} />+{selected.dial}
              </span>
              <ChevronDown className="w-4 h-4 shrink-0" />
            </button>
            {open && (
              <div
                className="absolute z-30 mt-1 w-[min(20rem,calc(100vw-3rem))] bg-white border"
                style={{ borderColor: '#EFE9DC' }}
              >
                <div className="p-2">
                  <input
                    ref={searchRef}
                    className={styles.control}
                    placeholder="Cerca paese o prefisso"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <ul role="listbox" className="max-h-64 overflow-y-auto">
                  {filtered.map((row) => (
                    <li key={row.iso}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-[#FAF7F0]"
                        style={{
                          background: row.iso === iso ? '#EFE9DC' : undefined,
                          color: '#1A1A17',
                        }}
                        onClick={() => {
                          setIso(row.iso);
                          setOpen(false);
                          setQuery('');
                        }}
                      >
                        <Flag iso={row.iso} />+{row.dial} {row.name}
                      </button>
                    </li>
                  ))}
                  {filtered.length === 0 && (
                    <li className="px-3 py-2 text-sm" style={{ color: '#5C5A52' }}>
                      Nessun paese trovato.
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
          <input
            className={styles.control}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="333 123 4567"
            value={national}
            onChange={(e) => setNational(e.target.value.replace(/[^\d\s]/g, ''))}
          />
        </div>
        <Button type="button" disabled={saving} onClick={() => onSave(composeWhatsapp(iso, national))}>
          Salva numero
        </Button>
      </div>
    </div>
  );
};
