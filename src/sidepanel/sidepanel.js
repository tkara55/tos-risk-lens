import { analyze, DISCLAIMER_TR } from '../core/pipeline.js';
import { anthropicProvider, DEFAULT_MODEL } from '../llm/anthropic.js';
import { renderDisclaimer, renderReport } from '../ui/report-view.js';

const $ = (id) => document.getElementById(id);
$('disclaimer').append(renderDisclaimer(DISCLAIMER_TR));

const settings = await chrome.storage.local.get({ apiKey: '', model: DEFAULT_MODEL, effort: 'medium' });
$('privacy').textContent = settings.apiKey
  ? `Analizde sayfanın yalnızca görünür metni, kendi anahtarınızla Anthropic API'sine (${settings.model}) gönderilir.`
  : 'LLM anahtarı tanımlı değil: yalnızca anahtar kelime kuralları çalışır. Anahtar eklemek için uzantı ayarlarını açın.';

let currentTabId = null;

$('analyze').addEventListener('click', async () => {
  $('error').hidden = true;
  $('analyze').disabled = true;
  $('report').replaceChildren();
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTabId = tab.id;
    $('progress').textContent = 'Sayfa metni okunuyor…';
    const page = await extractFromTab(tab.id);
    const provider = settings.apiKey ? anthropicProvider({ apiKey: settings.apiKey, model: settings.model, effort: settings.effort }) : null;
    const report = await analyze(
      { segments: page.segments, hidden: page.hidden, meta: { url: page.url, title: page.title } },
      provider,
      { onProgress: (m) => { $('progress').textContent = m; } },
    );
    report.extractor = page.extractor;
    renderReport($('report'), report, { onHighlight: (id) => highlight(id) });
    $('progress').textContent = '';
  } catch (e) {
    $('progress').textContent = '';
    $('error').hidden = false;
    $('error').textContent = explainError(e);
  } finally {
    $('analyze').disabled = false;
  }
});

async function extractFromTab(tabId) {
  await chrome.scripting.executeScript({ target: { tabId }, files: ['extract.js'] });
  const [{ result }] = await chrome.scripting.executeScript({ target: { tabId }, func: () => window.__tosLens.extract() });
  if (!result) throw new Error('Sayfa metni alınamadı');
  return result;
}

async function highlight(segmentId) {
  if (currentTabId == null) return;
  await chrome.scripting.executeScript({ target: { tabId: currentTabId }, func: (id) => window.__tosLens?.highlight(id), args: [segmentId] });
}

function explainError(e) {
  const msg = String(e?.message || e);
  if (/Cannot access|cannot be scripted|activeTab|permission/i.test(msg)) return 'Bu sekmeye erişim izni yok. Sayfadayken uzantı simgesine tekrar tıklayıp yeniden deneyin. (chrome:// ve Web Mağazası sayfaları analiz edilemez.)';
  return `Analiz başarısız: ${msg}`;
}
