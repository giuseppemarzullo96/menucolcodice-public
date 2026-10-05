import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import styles from '@/styles/admin.module.css';

type Mode = 'tenant' | 'platform';

function formatDwell(seconds: number) {
  const n = Math.max(0, Number(seconds) || 0);
  if (n < 60) return `${n} s`;
  const min = Math.floor(n / 60);
  const sec = n % 60;
  return sec ? `${min} min ${sec} s` : `${min} min`;
}

function formatDay(value: string) {
  const [y, m, d] = String(value || '').split('-');
  if (!d) return value;
  return `${d}/${m}`;
}

function deviceLabel(id: string) {
  if (id === 'phone') return 'Telefono';
  if (id === 'tablet') return 'Tablet';
  if (id === 'desktop') return 'Computer';
  return 'Altro';
}

function outboundLabel(id: string) {
  if (id === 'whatsapp') return 'WhatsApp';
  if (id === 'justeat') return 'Just Eat';
  return id.charAt(0).toUpperCase() + id.slice(1);
}

export const AnalyticsTab: React.FC<{ mode: Mode; analyticsLocked?: boolean }> = ({ mode, analyticsLocked }) => {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', mode, days],
    queryFn: async () => {
      const url = mode === 'platform' ? `/api/analytics/platform?days=${days}` : `/api/analytics/summary?days=${days}`;
      const response = await fetch(url);
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Statistiche non disponibili');
      return body;
    },
    enabled: !analyticsLocked,
  });

  if (analyticsLocked) {
    return (
      <div className={styles.banner} style={{ marginBottom: '1rem' }}>
        <strong>Statistiche nel piano Media.</strong> Vedi quante persone inquadrano il QR, quanto restano sul menu e quali piatti aprono di più. Passa a Media (13,99 €/mese + IVA) per sbloccarle.
      </div>
    );
  }

  if (isLoading) return <p className={styles.muted}>Carico le statistiche…</p>;
  if (error || !data) return <p className={styles.muted}>Non riesco a leggere le statistiche.</p>;

  const totals = data.totals || {};
  const maxSeries = Math.max(
    1,
    ...(data.series || []).map((row: any) => Math.max(row.pageViews || 0, row.qrScans || 0, row.sessions || 0))
  );
  const devices = data.devices || {};
  let deviceTotal = 0;
  Object.values(devices).forEach((n) => {
    deviceTotal += Number(n || 0);
  });
  if (deviceTotal < 1) deviceTotal = 1;
  const hourMax = Math.max(1, ...(data.hours || []).map((row: any) => row.count || 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={styles.muted}>
          {mode === 'platform'
            ? data.note || 'Tutti i menu dei locali, ultimi giorni.'
            : 'Visite al tuo menu: QR, tempo, scroll e piatti aperti. I QR stampati prima di oggi senza parametro src=qr restano visite, non scansioni.'}
        </p>
        <label className={styles.muted}>
          Periodo{' '}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="ml-1 border border-[#EFE9DC] bg-white px-2 py-1 text-[#1A1A17]"
          >
            <option value={7}>7 giorni</option>
            <option value={30}>30 giorni</option>
            <option value={90}>90 giorni</option>
          </select>
        </label>
      </div>

      <div className={styles.grid}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{totals.qrScans || 0}</span>
          <span className={styles.statLabel}>Scansioni QR</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{totals.sessions || 0}</span>
          <span className={styles.statLabel}>Sessioni</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{totals.pageViews || totals.menuViews || 0}</span>
          <span className={styles.statLabel}>Pagine viste</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{formatDwell(totals.avgDwellSec || 0)}</span>
          <span className={styles.statLabel}>Tempo medio sulla pagina</span>
        </div>
      </div>

      {mode === 'tenant' ? (
        <div className={styles.grid}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{totals.homeViews || 0}</span>
            <span className={styles.statLabel}>Home del menu</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{totals.menuViews || 0}</span>
            <span className={styles.statLabel}>Lista piatti</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{totals.dishOpens || 0}</span>
            <span className={styles.statLabel}>Schede piatto aperte</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>
              {totals.scroll100 || 0}/{totals.scroll75 || 0}/{totals.scroll50 || 0}
            </span>
            <span className={styles.statLabel}>Scroll 100% / 75% / 50%</span>
          </div>
        </div>
      ) : (
        <div className={styles.stat}>
          <span className={styles.statValue}>{totals.dishOpens || 0}</span>
          <span className={styles.statLabel}>Schede piatto aperte in tutti i locali</span>
        </div>
      )}

      <div className={styles.stat}>
        <p className={styles.statLabel} style={{ marginBottom: '0.85rem' }}>
          Andamento (sessioni)
        </p>
        <div className={styles.bars}>
          {(data.series || []).map((row: any) => (
            <div className={styles.barRow} key={row.day}>
              <span>{formatDay(row.day)}</span>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${((row.sessions || 0) / maxSeries) * 100}%` }} />
              </div>
              <span>{row.sessions || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {mode === 'tenant' && (data.hours || []).some((row: any) => row.count > 0) ? (
        <div className={styles.stat}>
          <p className={styles.statLabel} style={{ marginBottom: '0.85rem' }}>
            Orari delle sessioni
          </p>
          <div className={styles.bars}>
            {data.hours.filter((row: any) => row.count > 0).map((row: any) => (
              <div className={styles.barRow} key={row.hour}>
                <span>{String(row.hour).padStart(2, '0')}:00</span>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${((row.count || 0) / hourMax) * 100}%` }} />
                </div>
                <span>{row.count || 0}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {mode === 'tenant' ? (
        <div className={styles.grid}>
          <div>
            <h2 className={styles.title}>Piatti più aperti</h2>
            {(data.topDishes || []).length === 0 ? (
              <p className={styles.muted} style={{ marginTop: '0.6rem' }}>Ancora nessun piatto aperto.</p>
            ) : (
              <div className={styles.tableWrap} style={{ marginTop: '0.6rem' }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Piatto</th>
                      <th>Aperture</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topDishes.map((row: any) => (
                      <tr key={row.id}>
                        <td>{row.name}</td>
                        <td>{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div>
            <h2 className={styles.title}>Dispositivi e link</h2>
            <div className={styles.tableWrap} style={{ marginTop: '0.6rem' }}>
              <table className={styles.table}>
                <tbody>
                  {Object.entries(devices).map(([id, count]) => (
                    <tr key={id}>
                      <td>{deviceLabel(id)}</td>
                      <td>
                        {Number(count)} ({Math.round((Number(count) / deviceTotal) * 100)}%)
                      </td>
                    </tr>
                  ))}
                  {Object.entries(data.outbound || {}).map(([id, count]) => (
                    <tr key={id}>
                      <td>Click {outboundLabel(id)}</td>
                      <td>{Number(count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Locale</th>
                <th>QR</th>
                <th>Sessioni</th>
                <th>Pagine</th>
                <th>Tempo medio</th>
                <th>Piatti</th>
              </tr>
            </thead>
            <tbody>
              {(data.locali || []).map((row: any) => (
                <tr key={row.slug}>
                  <td>
                    <strong>{row.name}</strong>
                    <div className={styles.muted}>
                      {row.slug}.menucolcodice.it{row.isDemo ? ' · demo' : ''}
                    </div>
                  </td>
                  <td>{row.qrScans}</td>
                  <td>{row.sessions}</td>
                  <td>{row.pageViews}</td>
                  <td>{formatDwell(row.avgDwellSec)}</td>
                  <td>{row.dishOpens}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
