/** App-wide settings that aren't theme. The name is a placeholder until branding is final. */
export const APP_CONFIG = {
  name: 'Catalogue',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  requestTimeoutMs: 10_000,
  locale: 'en-AU',
} as const;
