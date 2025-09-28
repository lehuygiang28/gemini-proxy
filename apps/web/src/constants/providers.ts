export type Provider = {
  label: string;
  color: string;
};

export const PROVIDERS: { [key: string]: Provider } = {
  googleaistudio: {
    label: 'Google AI Studio',
    color: 'blue',
  },
  // Add other providers here
};

export const PROVIDER_OPTIONS = Object.entries(PROVIDERS).map(
  ([value, { label }]) => ({
    value,
    label,
  }),
);