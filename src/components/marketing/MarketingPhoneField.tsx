import { useEffect, useMemo, useRef, useState } from 'react';
import styles from '@/styles/marketing.module.css';
import {
  countriesForPicker,
  countryByIso,
  composeWhatsapp,
  parseStoredWhatsapp,
} from '@/utils/countryCallingCodes';

type Props = {
  value: string;
  onChange: (e164: string) => void;
  required?: boolean;
};

export function MarketingPhoneField({ value, onChange, required }: Props) {
  const parsed = parseStoredWhatsapp(value);
  const [iso, setIso] = useState(parsed.iso || 'IT');
  const [national, setNational] = useState(parsed.national);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);
  const countries = useMemo(() => countriesForPicker(), []);
  const selected = countryByIso(iso);

  const emit = (nextIso: string, nextNational: string) => {
    onChange(composeWhatsapp(nextIso, nextNational));
  };

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const filtered = countries.filter((row) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return row.name.toLowerCase().includes(q) || row.dial.includes(q) || row.iso.toLowerCase().includes(q);
  });

  return (
    <div className={styles.phoneField} ref={boxRef}>
      <div className={styles.phoneRow}>
        <button type="button" className={styles.phonePrefixBtn} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          +{selected.dial}
        </button>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          className={styles.phoneInput}
          value={national}
          onChange={(e) => {
            const next = e.target.value.replace(/[^\d\s]/g, '');
            setNational(next);
            emit(iso, next);
          }}
          placeholder="333 1234567"
          required={required}
          aria-label="Numero di telefono"
        />
      </div>
      {open ? (
        <div className={styles.phoneDropdown}>
          <input
            type="search"
            className={styles.phoneSearch}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca paese"
          />
          <ul className={styles.phoneList}>
            {filtered.slice(0, 40).map((row) => (
              <li key={row.iso}>
                <button
                  type="button"
                  className={styles.phoneOption}
                  onClick={() => {
                    setIso(row.iso);
                    emit(row.iso, national);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  {row.name} (+{row.dial})
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
