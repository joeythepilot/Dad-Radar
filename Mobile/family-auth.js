// Only the password gateway emits this header. Local display and Cloudflare
// Access installations continue to use their existing authentication behavior.
(() => {
  const original = window.fetch;
  if (!original) return;
  let redirecting = false;
  window.fetch = async function (...args) {
    const response = await original.apply(this, args);
    if (response.status === 401 && response.headers.get('X-Dad-Radar-Login') === '/family/login' &&
      new URL(response.url, location.href).origin === location.origin && !redirecting) {
      redirecting = true;
      location.replace('/family/login');
    }
    return response;
  };
})();
