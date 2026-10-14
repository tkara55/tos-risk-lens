// Service worker: badge for detected legal pages + side panel wiring. The analysis itself
// runs in the side panel page (an extension page), which keeps the API key out of every
// web page and avoids MV3 service-worker lifetime limits during long LLM calls.

const KIND_LABEL = { terms: 'Kullanım koşulları', privacy: 'Gizlilik politikası', subscription: 'Abonelik şartları' };

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type !== 'legal-page-detected' || !sender.tab?.id) return;
  const tabId = sender.tab.id;
  chrome.action.setBadgeText({ tabId, text: msg.confidence === 'high' ? '!' : '?' });
  chrome.action.setBadgeBackgroundColor({ tabId, color: msg.confidence === 'high' ? '#c92a2a' : '#868e96' });
  chrome.action.setTitle({ tabId, title: `${KIND_LABEL[msg.kind] || 'Yasal metin'} algılandı — risk analizi için tıklayın` });
});
