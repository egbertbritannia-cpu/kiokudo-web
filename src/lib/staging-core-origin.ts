/**
 * Controlled local/remote STAGING origin policy.
 *
 * Remote reads require explicit HTTPS hostname pin and opt-in.
 * They do not grant production DB access or browser write permission.
 */
export function isStagingReadEnabled(browserHost?: string): boolean {
  const local = process.env.NODE_ENV === 'development' &&
    process.env.KIOKUDO_STAGING_READ_ENABLED === 'true' &&
    (browserHost === undefined || browserHost === 'localhost' || browserHost === '127.0.0.1');
  const remote = process.env.NODE_ENV === 'production' &&
    process.env.KIOKUDO_REMOTE_STAGING_READ_ENABLED === 'true';
  return local || remote;
}

export function stagingCoreOrigin(raw: string): URL {
  const url = new URL(raw);
  if (url.username || url.password || url.search || url.hash ||
      !['', '/'].includes(url.pathname)) {
    throw new Error('invalid_core_origin');
  }
  if (process.env.NODE_ENV === 'development' &&
      process.env.KIOKUDO_STAGING_READ_ENABLED === 'true' &&
      url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)) {
    return url;
  }
  if (process.env.NODE_ENV === 'production' &&
      process.env.KIOKUDO_REMOTE_STAGING_READ_ENABLED === 'true') {
    const allowed = process.env.KIOKUDO_CORE_ALLOWED_HOST ?? '';
    if (/^[a-z0-9.-]{4,253}$/.test(allowed) &&
        allowed.includes('.') && !allowed.endsWith('.') &&
        !['localhost', '127.0.0.1'].includes(allowed) &&
        url.protocol === 'https:' && url.hostname === allowed &&
        (url.port === '' || url.port === '443')) {
      return url;
    }
  }
  throw new Error('unapproved_staging_core_origin');
}
