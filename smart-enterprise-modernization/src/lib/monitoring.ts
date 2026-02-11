// Placeholder: configure Sentry DSN in production env
export function captureError(err: any) {
  // replace with Sentry.captureException(err)
  console.error('MONITOR:', err);
}
