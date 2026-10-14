const $ = (id) => document.getElementById(id);
const current = await chrome.storage.local.get({ apiKey: '', model: 'claude-opus-5-5', effort: 'medium' });
$('apiKey').value = current.apiKey;
$('model').value = current.model;
$('effort').value = current.effort;

$('save').addEventListener('click', async () => {
  await chrome.storage.local.set({ apiKey: $('apiKey').value.trim(), model: $('model').value, effort: $('effort').value });
  $('msg').textContent = 'Kaydedildi.';
});
$('clear').addEventListener('click', async () => {
  await chrome.storage.local.remove('apiKey');
  $('apiKey').value = '';
  $('msg').textContent = 'Anahtar silindi.';
});
