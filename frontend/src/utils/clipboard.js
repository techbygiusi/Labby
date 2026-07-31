/**
 * Copy text to the clipboard.
 *
 * Self-hosted portals are often reached over plain HTTP, where the async
 * clipboard API is unavailable because the page is not a secure context.
 * In that case fall back to the legacy execCommand path.
 */
export async function copyTextToClipboard(value) {
  const text = String(value || '');
  if (!text) return false;

  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) { /* fall through to the legacy path below */ }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.inset = '-9999px auto auto -9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    textarea.remove();
    return ok;
  } catch (_) {
    return false;
  }
}

export default copyTextToClipboard;
