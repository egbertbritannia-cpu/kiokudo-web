/**
 * UI pages are login-free. Core data remains private by default.
 *
 * A real local developer can read/write through the BFF without an app login.
 * Hosted access requires BOTH operator opt-ins and a private upstream ingress
 * that restricts who can reach the deployment. These flags attest to an
 * EXTERNAL access control; they are not authentication by themselves.
 */
const OWNER_FORMAT = /^[A-Za-z0-9_-]{3,64}$/;

function isLoopback(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function approvedPrivateHostname(hostname: string): boolean {
  const configured = process.env.KIOKUDO_WEB_PUBLIC_ORIGIN;
  if (!configured) return false;
  try {
    const origin = new URL(configured);
    return origin.protocol === 'https:' &&
      !origin.username && !origin.password && !origin.search && !origin.hash &&
      (origin.pathname === '/' || origin.pathname === '') &&
      origin.port === '' && hostname === origin.hostname &&
      !isLoopback(origin.hostname);
  } catch {
    return false;
  }
}

export function loginlessOwnerForHost(hostname: string): string | null {
  const owner = process.env.KIOKUDO_OWNER_SUBJECT;
  if (!owner || !OWNER_FORMAT.test(owner)) return null;

  if (process.env.NODE_ENV === 'development' && isLoopback(hostname) &&
      process.env.KIOKUDO_LOGINLESS_LOCAL_ENABLED !== 'false') {
    return owner;
  }

  if (process.env.NODE_ENV === 'production' &&
      process.env.KIOKUDO_LOGINLESS_PRIVATE_MODE === 'true' &&
      process.env.KIOKUDO_PRIVATE_INGRESS_VERIFIED === 'true' &&
      approvedPrivateHostname(hostname)) {
    return owner;
  }

  return null;
}
