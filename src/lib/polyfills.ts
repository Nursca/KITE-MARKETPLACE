/**
 * Polyfill for process.stdout to prevent "Cannot read properties of undefined (reading 'isTTY')"
 * in browser environments, which is caused by Node-only packages like dotenv being imported
 * in client components.
 */

if (typeof window !== 'undefined') {
  if (typeof process === 'undefined') {
    // @ts-ignore
    window.process = { env: {} };
  }
  
  // @ts-ignore
  if (!process.stdout) {
    // @ts-ignore
    process.stdout = { isTTY: false };
  }
}
