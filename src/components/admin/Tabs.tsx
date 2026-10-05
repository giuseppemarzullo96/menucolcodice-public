import React from 'react';
import styles from '@/styles/admin.module.css';

interface Tab {
  key: string;
  label: React.ReactNode;
  children: React.ReactNode;
}

interface TabsProps {
  items: Tab[];
  defaultActiveKey?: string;
  activeKey?: string;
  onChange?: (key: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  defaultActiveKey,
  activeKey: controlledActiveKey,
  onChange,
}) => {
  const [internalActiveKey, setInternalActiveKey] = React.useState(
    defaultActiveKey || items[0]?.key || ''
  );

  const activeKey = controlledActiveKey !== undefined ? controlledActiveKey : internalActiveKey;
  const handleTabClick = (key: string) => {
    if (onChange) onChange(key);
    else setInternalActiveKey(key);
  };
  const activeTab = items.find((tab) => tab.key === activeKey) || items[0];

  return (
    <div>
      <nav className={styles.tabs} aria-label="Sezioni">
        {items.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTabClick(tab.key)}
            className={`${styles.tab} ${activeKey === tab.key ? styles.tabActive : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className={styles.tabPanel}>{activeTab?.children}</div>
    </div>
  );
};
