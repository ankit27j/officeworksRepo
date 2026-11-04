import { App as AntApp, ConfigProvider } from 'antd';
import { observer } from 'mobx-react-lite';
import { type ReactNode, useEffect, useMemo } from 'react';
import { useStores } from '../hooks/useStores';
import { buildAntdTheme } from './antdTheme';
import styles from './AppThemeProvider.module.css';

/**
 * Applies the current theme to the whole app. Switching mode re-themes every Ant Design component
 * and every CSS Module that uses var(--ant-…), because both read the same tokens.
 */
export const AppThemeProvider = observer(function AppThemeProvider({ children }: { children: ReactNode }) {
  const { theme } = useStores();
  const config = useMemo(() => buildAntdTheme(theme.mode), [theme.mode]);

  // Lets the browser match native UI (scrollbars, form controls) to the mode.
  useEffect(() => {
    document.documentElement.dataset.theme = theme.mode;
  }, [theme.mode]);

  return (
    <ConfigProvider theme={config}>
      {/* AntApp's root element carries the CSS variables, so everything inside can use them. */}
      <AntApp className={styles.root}>{children}</AntApp>
    </ConfigProvider>
  );
});
