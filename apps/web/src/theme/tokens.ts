/**
 * Brand tokens: the ONLY place colours, fonts and radii are defined.
 * When the creative agency delivers the look and feel, this is the file to change. Components read
 * these through Ant Design's theme and CSS variables (var(--ant-…)), never as literal values.
 */
export const brandTokens = {
  colorPrimary: '#2f54eb',
  colorInfo: '#2f54eb',
  colorSuccess: '#2e9e5b',
  colorWarning: '#d48806',
  colorError: '#d4380d',
  borderRadius: 8,
  fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
} as const;

/** Per-mode overrides on top of Ant Design's light/dark algorithms. */
export const modeTokens = {
  light: {
    colorBgLayout: '#f5f7fb',
  },
  dark: {
    colorBgLayout: '#0d1117',
    colorBgContainer: '#161b22',
  },
} as const;
