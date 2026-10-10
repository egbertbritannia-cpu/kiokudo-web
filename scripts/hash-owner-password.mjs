import { randomBytes, scryptSync } from 'node:crypto';

// Run locally with the passphrase placed in KIOKUDO_OWNER_PASSWORD by a trusted
// secret-input method. Never pass it as a command-line argument or commit it.
const password = process.env.KIOKUDO_OWNER_PASSWORD;
if (!password || password.length < 16 || password.length > 256) {
  process.stderr.write('Supply a strong 16-256 character KIOKUDO_OWNER_PASSWORD via a secure local environment.\n');
  process.exitCode = 1;
} else {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64);
  process.stdout.write(salt.toString('hex') + ':' + key.toString('hex') + '\n');
}
