import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import styles from '@/styles/admin.module.css';
import { formatEuro, planName } from '@/utils/plans';
import { CancelSubscriptionButton } from './SubscriptionTab';

export function usePlatformOverview() {
  return useQuery({
    queryKey: ['platform-overview'],
    queryFn: async () => {
      const response = await fetch('/api/platform/overview');
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Panoramica non disponibile');
      return data;
    },
  });
}

function when(ts: number) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
}

function PlanSelect({ slug, plan, locked }: { slug: string; plan: string; locked?: boolean }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(plan);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setValue(plan);
  }, [plan]);

  if (locked) return <span>{planName(plan)}</span>;

  const onChange = async (next: string) => {
    if (next === value || busy) return;
    const prev = value;
    setValue(next);
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/platform/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, plan: next }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Salvataggio fallito');
      await queryClient.invalidateQueries({ queryKey: ['platform-overview'] });
    } catch (err) {
      setValue(prev);
      setError(err instanceof Error ? err.message : 'Non salvato');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <select
        className={`${styles.control} ${styles.controlCompact}`}
        value={value}
        disabled={busy}
        aria-label={`Piano di ${slug}`}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="free">Free</option>
        <option value="medium">Media</option>
        <option value="pro">Pro</option>
      </select>
      {error ? <div className={styles.muted}>{error}</div> : null}
    </div>
  );
}

export const OverviewTab: React.FC = () => {
  const { data, isLoading, error } = usePlatformOverview();
  if (isLoading) return <p className={styles.muted}>Carico i locali…</p>;
  if (error || !data) return <p className={styles.muted}>Non riesco a leggere i locali.</p>;

  const total = Math.max(data.totals.clienti, 1);
  const bars = [
    { id: 'free', label: 'Free', count: data.totals.byPlan.free },
    { id: 'medium', label: 'Media', count: data.totals.byPlan.medium },
    { id: 'pro', label: 'Pro', count: data.totals.byPlan.pro },
  ];

  return (
    <div className="space-y-6">
      <p className={styles.muted}>{data.note}</p>
      <div className={styles.grid}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{data.totals.clienti}</span>
          <span className={styles.statLabel}>Locali iscritti</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{data.totals.pendingPaypal}</span>
          <span className={styles.statLabel}>Iscrizioni in attesa di pagamento</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{data.totals.piatti}</span>
          <span className={styles.statLabel}>Piatti pubblicati dai clienti</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{formatEuro(data.totals.monthlyIvaIncl)} €</span>
          <span className={styles.statLabel}>Stima mensile IVA inclusa</span>
        </div>
      </div>
      <div className={styles.stat}>
        <p className={styles.statLabel} style={{ marginBottom: '0.85rem' }}>
          Locali per piano (senza la demo)
        </p>
        <div className={styles.bars}>
          {bars.map((row) => (
            <div className={styles.barRow} key={row.id}>
              <span>{row.label}</span>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${(row.count / total) * 100}%` }} />
              </div>
              <span>{row.count}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Locale</th>
              <th>Piano</th>
              <th>Piatti</th>
              <th>Categorie</th>
              <th>Ultima modifica</th>
            </tr>
          </thead>
          <tbody>
            {data.locali
              .filter((row: any) => !row.isDemo)
              .map((row: any) => (
                <tr key={row.slug}>
                  <td>
                    <strong>{row.name}</strong>
                    <div className={styles.muted}>{row.slug}.menucolcodice.it</div>
                  </td>
                  <td>
                    <PlanSelect slug={row.slug} plan={row.plan} />
                  </td>
                  <td>{row.products}</td>
                  <td>{row.categories}</td>
                  <td>{when(row.lastEditAt)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const SignupsTab: React.FC = () => {
  const { data, isLoading, error } = usePlatformOverview();
  if (isLoading) return <p className={styles.muted}>Carico le iscrizioni…</p>;
  if (error || !data) return <p className={styles.muted}>Non riesco a leggere le iscrizioni.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className={styles.title}>In attesa di pagamento</h2>
        <p className={styles.muted}>Hanno scelto Media o Pro e non hanno ancora chiuso il pagamento.</p>
        {data.pending.length === 0 ? (
          <p className={styles.muted} style={{ marginTop: '0.8rem' }}>
            Nessuna iscrizione in attesa.
          </p>
        ) : (
          <div className={styles.tableWrap} style={{ marginTop: '0.8rem' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Locale</th>
                  <th>Email</th>
                  <th>Piano</th>
                  <th>Iniziata</th>
                </tr>
              </thead>
              <tbody>
                {data.pending.map((row: any) => (
                  <tr key={row.slug}>
                    <td>
                      <strong>{row.name}</strong>
                      <div className={styles.muted}>{row.slug}</div>
                    </td>
                    <td>{row.email || '—'}</td>
                    <td>{planName(row.plan)}</td>
                    <td>{when(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div>
        <h2 className={styles.title}>Locali attivi</h2>
        <p className={styles.muted}>
          Ogni riga è un account. Il menu a tendina cambia il piano: sblocca le funzioni, non crea né chiude
          un abbonamento Stripe o PayPal. La demo resta Pro.
        </p>
        <div className={styles.tableWrap} style={{ marginTop: '0.8rem' }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Locale</th>
                <th>Email</th>
                <th>Piano</th>
                <th>Stato</th>
                <th>Abbonamento</th>
                <th>Apri</th>
              </tr>
            </thead>
            <tbody>
              {data.locali.map((row: any) => (
                <tr key={row.slug}>
                  <td>
                    <strong>{row.name}</strong>
                    <div className={styles.muted}>{row.slug}.menucolcodice.it</div>
                  </td>
                  <td>{row.email || '—'}</td>
                  <td>
                    <PlanSelect slug={row.slug} plan={row.plan} locked={row.isDemo} />
                  </td>
                  <td>{row.isDemo ? 'Demo piattaforma' : row.status === 'active' ? 'Attivo' : 'Sospeso'}</td>
                  <td>
                    <CancelSubscriptionButton
                      slug={row.slug}
                      plan={row.plan}
                      billingProvider={row.billingProvider}
                      hasSubscription={row.hasSubscription}
                      isDemo={row.isDemo}
                      cancelAtPeriodEnd={row.cancelAtPeriodEnd}
                      subscriptionEndsAt={row.subscriptionEndsAt}
                      cancellable={row.cancellable}
                    />
                  </td>
                  <td>
                    <a href={row.menuUrl} target="_blank" rel="noreferrer">
                      Menu
                    </a>
                    {' · '}
                    <a href={row.adminUrl} target="_blank" rel="noreferrer">
                      Admin
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
