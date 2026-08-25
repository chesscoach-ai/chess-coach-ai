import "server-only";

type Attempt = { failures: number; firstFailure: number; blockedUntil: number };
const attempts = new Map<string, Attempt>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

function key(email: string): string { return email.trim().toLocaleLowerCase("fr"); }

export function canAttemptLogin(email: string): boolean {
  const current = attempts.get(key(email));
  if (!current) return true;
  const now = Date.now();
  if (current.blockedUntil > now) return false;
  if (now - current.firstFailure > WINDOW_MS) attempts.delete(key(email));
  return true;
}

export function recordFailedLogin(email: string): void {
  const identifier = key(email); const now = Date.now(); const current = attempts.get(identifier);
  if (!current || now - current.firstFailure > WINDOW_MS) { attempts.set(identifier, { failures: 1, firstFailure: now, blockedUntil: 0 }); return; }
  const failures = current.failures + 1;
  attempts.set(identifier, { ...current, failures, blockedUntil: failures >= MAX_FAILURES ? now + WINDOW_MS : 0 });
}

export function clearLoginFailures(email: string): void { attempts.delete(key(email)); }
