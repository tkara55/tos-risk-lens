// Runs on every page, reads only URL/title/headings, sends nothing off-device.
// If the page looks like terms / privacy / subscription text, the toolbar badge lights
// up. Full text extraction happens only when the user asks for an analysis.

const URL_RE = /(terms|tos|legal|privacy|gizlilik|kosul|koşul|sozlesme|sözleşme|policy|politika|agreement|eula|conditions|kvkk|aydinlatma|aydınlatma|subscription|abonelik)/i;
const TEXT_RE = /(terms of (service|use)|privacy (policy|notice|statement)|user agreement|subscription terms|end user license|kullanım koşulları|kullanim kosullari|gizlilik politikası|üyelik sözleşmesi|kullanıcı sözleşmesi|aydınlatma metni|abonelik (şartları|sözleşmesi)|hizmet şartları|mesafeli satış)/i;

function classify() {
  const headings = [...document.querySelectorAll('h1,h2')].slice(0, 6).map((h) => h.textContent || '').join(' ');
  const hay = `${document.title} ${headings}`;
  const textHit = TEXT_RE.test(hay);
  const urlHit = URL_RE.test(location.pathname);
  if (!textHit && !urlHit) return null;
  const kind = /privacy|gizlilik|kvkk|aydınlatma/i.test(hay + location.pathname) ? 'privacy'
    : /subscription|abonelik/i.test(hay) ? 'subscription' : 'terms';
  return { kind, confidence: textHit ? 'high' : 'low' };
}

const result = classify();
if (result) chrome.runtime.sendMessage({ type: 'legal-page-detected', ...result }).catch(() => {});
