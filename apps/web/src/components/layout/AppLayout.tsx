import { Layout } from 'antd';
import type { ReactNode } from 'react';
import styles from './AppLayout.module.css';

interface AppLayoutProps {
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

/** Page frame: header, centred content column, footer. Uses landmark elements for accessibility. */
export function AppLayout({ header, footer, children }: AppLayoutProps) {
  return (
    <Layout className={styles.layout}>
      <header className={styles.header}>{header}</header>
      <main className={styles.main}>
        <div className={styles.container}>{children}</div>
      </main>
      {footer && <footer className={styles.footer}>{footer}</footer>}
    </Layout>
  );
}
