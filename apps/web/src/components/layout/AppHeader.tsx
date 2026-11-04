import { ShopOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { paths } from '../../config/paths';
import styles from './AppHeader.module.css';

interface AppHeaderProps {
  appName: string;
  search: ReactNode;
  nav: ReactNode;
  actions?: ReactNode;
}

/** Brand, search and actions on top; category navigation underneath. Slots keep it free of data logic. */
export function AppHeader({ appName, search, nav, actions }: AppHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.top}>
        <Link to={paths.home()} className={styles.brand}>
          <ShopOutlined aria-hidden />
          <span>{appName}</span>
        </Link>
        <div className={styles.search}>{search}</div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      {nav}
    </div>
  );
}
