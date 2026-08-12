export function scheduleAnalysis(
  callback: () => void,
  delayMs: number,
  onAvoided: () => void,
): () => void {
  let started = false;
  const timer = globalThis.setTimeout(() => {
    started = true;
    callback();
  }, delayMs);
  return () => {
    globalThis.clearTimeout(timer);
    if (!started) onAvoided();
  };
}
