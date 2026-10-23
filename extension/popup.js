const $ = (id) => document.getElementById(id);
let contacts = [];
let invalid = [];
let duplicates = [];

function normalize(value) {
  const raw = String(value ?? '').trim();
  let digits = raw.replace(/[^0-9]/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 11) digits = `92${digits.slice(1)}`;
  if (digits.startsWith('3') && digits.length === 10) digits = `92${digits}`;
  if (!digits || digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

function setNotice(text, error = true) {
  $('notice').textContent = text;
  $('notice').style.color = error ? '#a33b00' : '#16805c';
}

async function renderPreview() {
  const manual = getManualNumbers();
  const campaign = await getCampaign();
  const campaignContacts = Array.isArray(campaign?.contacts) ? campaign.contacts : [];
  const baseContacts = contacts.length ? contacts : campaignContacts;
  const previewContacts = $('testMode')?.checked ? manual.valid.map((number) => ({ number, sourceStatus: 'manual test' })) : baseContacts;
  const campaignNumbers = new Set((campaign?.contacts || []).map((c) => c.number));
  const statusMap = new Map((campaign?.results || []).map((result) => [result.number, result.status]));
  const rows = previewContacts.slice(0, 100).map((c, i) => {
    const status = campaignNumbers.has(c.number) ? (statusMap.get(c.number) || 'pending') : (c.sourceStatus || 'ready');
    return `<tr><td>${i + 1}</td><td>${escapeHtml(c.number)}</td><td>${escapeHtml(status)}</td></tr>`;
  }).join('');
  $('previewBody').innerHTML = rows || '<tr><td colspan="3">Load an Excel file to preview.</td></tr>';
  $('validCount').textContent = `Valid: ${previewContacts.length}`;
  $('invalidCount').textContent = `Invalid: ${invalid.length}`;
  $('duplicateCount').textContent = `Duplicates: ${duplicates.length}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function getManualNumbers() {
  const values = ($('testNumber')?.value || '').split(/[,;\n]+/).map((value) => value.trim()).filter(Boolean);
  const valid = []; const invalid = []; const duplicates = []; const seen = new Set();
  for (const value of values) {
    const number = normalize(value);
    if (!number) { invalid.push(value); continue; }
    if (seen.has(number)) { duplicates.push(number); continue; }
    seen.add(number); valid.push(number);
  }
  return { valid, invalid, duplicates };
}

async function loadFile(file) {
  if (!file) return;
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const header = (rows.shift() || []).map((x) => String(x).toLowerCase());
    const phoneIndex = Math.max(0, header.findIndex((x) => /phone|number|mobile/.test(x)));
    const seen = new Set(); contacts = []; invalid = []; duplicates = [];
    for (const row of rows) {
      const original = row[phoneIndex];
      const number = normalize(original);
      if (!number) { if (String(original).trim()) invalid.push(String(original)); continue; }
      if (seen.has(number)) { duplicates.push(number); continue; }
      seen.add(number); contacts.push({ number, name: String(row[1] || '') });
    }
    await chrome.storage.local.set({
      importedContacts: contacts,
      importMeta: { fileName: file.name, rowCount: rows.length, invalid, duplicates }
    });
    $('fileInfo').textContent = `${file.name} loaded (${rows.length} rows)`;
    renderPreview();
    setNotice('File loaded. Review preview before starting.', false);
  } catch (error) { setNotice(`Could not read file: ${error.message}`); }
}

function getOptouts() { return new Set($('optouts').value.split(/\r?\n/).map(normalize).filter(Boolean)); }
function getSettings() {
  const requestedDelay = Number.parseInt($('delay').value || '19', 10) || 19;
  const delay = Math.max(19, requestedDelay);
  $('delay').value = delay;
  return { message: $('message').value.trim(), delaySeconds: delay, optouts: [...getOptouts()], testMode: $('testMode').checked };
}

async function readOptionalImage() {
  const file = $('image').files?.[0];
  if (!file) return null;
  if (!file.type.startsWith('image/')) throw new Error('Please select an image file.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Image must be 5 MB or smaller.');
  return { name: file.name, type: file.type, dataUrl: await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }) };
}

async function getCampaign() { return (await chrome.storage.local.get('campaign')).campaign || null; }
function renderCampaign(campaign) {
  if (!campaign) {
    $('campaignStatus').textContent = 'No campaign.';
    $('log').innerHTML = '';
    $('start').disabled = false;
    $('start').textContent = 'Start';
    return;
  }
  const done = campaign.results?.filter((r) => r.status !== 'pending').length || 0;
  $('campaignStatus').textContent = `${campaign.status} — ${done}/${campaign.contacts.length} processed`;
  $('log').innerHTML = (campaign.results || []).slice(-30).reverse().map((r) => `<div>${escapeHtml(r.number)} — ${escapeHtml(r.status)}${r.error ? ` (${escapeHtml(r.error)})` : ''}</div>`).join('');
  const active = ['running', 'waiting', 'paused'].includes(campaign.status);
  $('start').disabled = active;
  $('start').textContent = active ? 'Campaign active' : 'Start';
}

async function sendCommand(command) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.url?.startsWith('https://web.whatsapp.com/')) throw new Error('Open the logged-in web.whatsapp.com tab first.');
  try {
    return await chrome.tabs.sendMessage(tab.id, { type: command });
  } catch (error) {
    // Tabs that were already open when the extension was installed may not
    // have received the declarative content script yet. Inject it once.
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    await new Promise((resolve) => setTimeout(resolve, 150));
    return chrome.tabs.sendMessage(tab.id, { type: command });
  }
}

async function start() {
  const existing = await getCampaign();
  if (existing && ['running', 'waiting', 'paused'].includes(existing.status)) {
    return setNotice('An active campaign already exists. Use Pause, Resume or Emergency stop; Start is disabled to prevent duplicates.');
  }
  const settings = getSettings();
  let image;
  try { image = await readOptionalImage(); } catch (error) { return setNotice(error.message); }
  if (!settings.message) return setNotice('Enter a message first.');
  if (!$('consent').checked) return setNotice('Confirm the risk/consent checkbox before starting.');
  const optouts = getOptouts();
  let selected;
  if ($('testMode').checked) {
    const manual = getManualNumbers();
    if (manual.invalid.length) return setNotice(`Invalid manual number(s): ${manual.invalid.join(', ')}`);
    if (!manual.valid.length) return setNotice('Enter at least one valid manual test number. Excel is optional in test mode.');
    selected = manual.valid.filter((number) => !optouts.has(number)).map((number) => ({ number, name: 'Manual test number', status: 'pending' }));
  } else {
    if (!contacts.length) return setNotice('Load an Excel file with valid phone numbers first.');
    selected = contacts.filter((c) => !optouts.has(c.number)).map((c) => ({ ...c, status: 'pending' }));
  }
  if (!selected.length) return setNotice('No recipients remain after applying the opt-out list.');
  const campaign = { id: crypto.randomUUID(), status: 'running', currentIndex: 0, contacts: selected, results: selected.map((c) => ({ number: c.number, status: 'pending' })), image, ...settings, createdAt: new Date().toISOString() };
  await chrome.storage.local.set({ campaign });
  try {
    await sendCommand('wake');
    setNotice('Campaign started.', false);
  } catch (error) {
    campaign.status = 'paused';
    await chrome.storage.local.set({ campaign });
    setNotice(`Could not connect to WhatsApp Web: ${error.message}. Reload the WhatsApp tab and try Resume.`);
  }
  renderCampaign(campaign);
}

async function setStatus(status) {
  const campaign = await getCampaign();
  if (!campaign) return setNotice('No campaign to control.');
  campaign.status = status;
  await chrome.storage.local.set({ campaign });
  try { await sendCommand(status); } catch (_) { /* tab may be navigating */ }
  renderCampaign(campaign);
}

$('file').addEventListener('change', (e) => loadFile(e.target.files[0]));
$('preview').addEventListener('click', () => { renderPreview(); setNotice('Preview refreshed.', false); });
$('start').addEventListener('click', start);
$('pause').addEventListener('click', () => setStatus('paused'));
$('resume').addEventListener('click', () => setStatus('running'));
$('stop').addEventListener('click', () => setStatus('stopped'));
$('delay').addEventListener('change', () => { if (Number($('delay').value) < 7) $('delay').value = 7; });
$('testMode').addEventListener('change', () => { $('testNumberRow').style.display = $('testMode').checked ? 'block' : 'none'; renderPreview(); });
$('testNumber').addEventListener('input', renderPreview);
$('image').addEventListener('change', () => { const file = $('image').files?.[0]; $('imageInfo').textContent = file ? `${file.name} selected — image will be sent with the message as caption.` : 'No image selected. Text-only sending will be used.'; });

function wrapSelection(prefix, suffix) {
  const field = $('message');
  const start = field.selectionStart;
  const end = field.selectionEnd;
  const selected = field.value.slice(start, end) || 'text';
  field.value = `${field.value.slice(0, start)}${prefix}${selected}${suffix}${field.value.slice(end)}`;
  field.focus();
  field.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
}

document.querySelectorAll('.format').forEach((button) => button.addEventListener('click', () => wrapSelection(button.dataset.prefix, button.dataset.suffix)));
$('lineBreak').addEventListener('click', () => {
  const field = $('message');
  const start = field.selectionStart;
  field.value = `${field.value.slice(0, start)}\n${field.value.slice(field.selectionEnd)}`;
  field.focus();
  field.setSelectionRange(start + 1, start + 1);
});

chrome.storage.onChanged.addListener((changes) => { if (changes.campaign) renderCampaign(changes.campaign.newValue); });

async function restoreImportedContacts() {
  const saved = await chrome.storage.local.get(['importedContacts', 'importMeta']);
  if (Array.isArray(saved.importedContacts) && saved.importedContacts.length) {
    contacts = saved.importedContacts.map((contact) => ({ ...contact, number: normalize(contact.number) })).filter((contact) => contact.number);
    invalid = saved.importMeta?.invalid || [];
    duplicates = saved.importMeta?.duplicates || [];
    $('fileInfo').textContent = `${saved.importMeta?.fileName || 'Saved workbook'} restored (${saved.importMeta?.rowCount || contacts.length} rows)`;
  }
  renderPreview();
}

async function restoreCampaignUI(campaign) {
  if (!campaign || !['running', 'waiting', 'paused'].includes(campaign.status)) return;
  $('message').value = campaign.message || '';
  $('delay').value = Math.max(19, Number(campaign.delaySeconds) || 19);
  $('testMode').checked = Boolean(campaign.testMode);
  if (campaign.testMode) $('testNumber').value = (campaign.contacts || []).map((contact) => contact.number).join(', ');
  $('optouts').value = (campaign.optouts || []).join('\n');
  $('consent').checked = true;
  $('imageInfo').textContent = campaign.image ? `${campaign.image.name} restored — image will be sent with the message as caption.` : 'No image selected. Text-only sending will be used.';
  if (!contacts.length && Array.isArray(campaign.contacts)) contacts = campaign.contacts.map((contact) => ({ ...contact }));
  $('testNumberRow').style.display = $('testMode').checked ? 'block' : 'none';
}

async function initializePopup() {
  const campaign = await getCampaign();
  await restoreImportedContacts();
  await restoreCampaignUI(campaign);
  renderCampaign(campaign);
  renderPreview();
}

initializePopup();
$('testNumberRow').style.display = $('testMode').checked ? 'block' : 'none';
