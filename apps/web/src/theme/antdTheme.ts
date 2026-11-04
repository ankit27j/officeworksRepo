import { theme, type ThemeConfig } from 'antd';
import type { ThemeMode } from '../stores/ThemeStore';
import { brandTokens, modeTokens } from './tokens';

/**
 * Ant Design theme for a mode. `cssVar` exposes every token as a CSS variable (e.g.
 * var(--ant-color-bg-container)), so our own CSS Modules follow the theme with no inline styles.
 */
export function buildAntdTheme(mode: ThemeMode): ThemeConfig {
  return {
    algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: { ...brandTokens, ...modeTokens[mode] },
    cssVar: { prefix: 'ant', key: 'catalogue' },
    hashed: false,
  };
}
