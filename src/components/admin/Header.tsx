import React from 'react';
import styles from '@/styles/admin.module.css';

type Workspace = 'platform' | 'demo';

interface HeaderProps {
  onLogout?: () => void;
  variant?: 'locale' | 'platform';
  title: string;
  kicker: string;
  meta?: string;
  menuUrl?: string;
  workspace?: Workspace;
  onWorkspace?: (workspace: Workspace) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onLogout,
  variant = 'locale',
  title,
  kicker,
  meta,
  menuUrl,
  workspace,
  onWorkspace,
}) => {
  const platform = variant === 'platform';
  return (
    <header className={`${styles.header} ${platform ? styles.headerPlatform : ''}`}>
      <div className={styles.headerInner}>
        <div className={styles.brand}>
          {platform ? (
            <img className={styles.logo} src="/brand/logo-orizzontale-negativo.svg" alt="" />
          ) : (
            <img className={styles.logo} src="/brand/logo-orizzontale.svg" alt="" />
          )}
          <div className={styles.titles}>
            <p className={styles.kicker}>{kicker}</p>
            <h1 className={styles.title}>{title}</h1>
            {meta ? <p className={styles.meta}>{meta}</p> : null}
          </div>
        </div>
        <div className={styles.actions}>
          {platform && onWorkspace ? (
            <div className={styles.switch} role="tablist" aria-label="Area del pannello">
              <button
                type="button"
                className={`${styles.switchBtn} ${workspace === 'platform' ? styles.switchBtnActive : ''}`}
                onClick={() => onWorkspace('platform')}
              >
                Piattaforma
              </button>
              <button
                type="button"
                className={`${styles.switchBtn} ${workspace === 'demo' ? styles.switchBtnActive : ''}`}
                onClick={() => onWorkspace('demo')}
              >
                Menu demo
              </button>
            </div>
          ) : null}
          {menuUrl ? (
            <a className={styles.link} href={menuUrl} target="_blank" rel="noreferrer">
              Vedi il menu
            </a>
          ) : null}
          {onLogout ? (
            <button type="button" className={styles.logout} onClick={onLogout}>
              Esci
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
};
