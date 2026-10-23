let busy = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getCampaign = async () => (await chrome.storage.local.get('campaign')).campaign || null;
const saveCampaign = (campaign) => chrome.storage.local.set({ campaign });

function setResult(campaign, index, status, error = '') {
  if (!campaign.results[index]) campaign.results[index] = { number: campaign.contacts[index].number, status: 'pending' };
  campaign.results[index].status = status;
  campaign.results[index].updatedAt = new Date().toISOString();
  if (error) campaign.results[index].error = error;
}

async function findMessageBox(timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const box = document.querySelector('[data-testid="conversation-compose-box-input"]') ||
      document.querySelector('[contenteditable="true"][aria-label*="Type a message" i]') ||
      [...document.querySelectorAll('[contenteditable="true"][role="textbox"], [contenteditable="true"]')]
        .find((el) => el.offsetParent !== null && !/search/i.test(`${el.getAttribute('aria-label') || ''} ${el.getAttribute('placeholder') || ''}`));
    if (box) return box;
    await sleep(500);
  }
  throw new Error('Message box was not found. Is WhatsApp Web logged in?');
}

function typeMessage(box, message) {
  box.focus();
  // WhatsApp's contenteditable editor can collapse newlines when plain text
  // is inserted. Insert explicit <br> nodes and preserve repeated spaces.
  const html = message
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    .replace(/ {2,}/g, (spaces) => spaces.replace(/ /g, '&nbsp;'))
    .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
    .replace(/\r\n?|\n/g, '<br>');
  if (!document.execCommand('insertHTML', false, html)) box.textContent = message;
  box.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: message }));
}

async function clickSend() {
  const start = Date.now();
  while (Date.now() - start < 10000) {
    const button = [...document.querySelectorAll('button, [role="button"]')].find((el) => {
      const label = `${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''}`.toLowerCase();
      return label.includes('send') || label.includes('bhej');
    });
    if (button) { button.click(); return; }
    await sleep(300);
  }
  throw new Error('Send button was not found. WhatsApp Web UI may have changed.');
}

async function sendImage(image, caption) {
  const attach = findLabeledButton(/attach|paperclip|file/i);
  if (!attach) throw new Error('WhatsApp attachment button was not found.');
  attach.click();
  const start = Date.now();
  let input;
  while (Date.now() - start < 10000 && !input) { input = document.querySelector('input[type="file"]'); if (!input) await sleep(300); }
  if (!input) throw new Error('WhatsApp image upload control was not found.');
  const response = await fetch(image.dataUrl);
  const blob = await response.blob();
  const file = new File([blob], image.name, { type: image.type });
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(1200);
  if (caption) {
    const captionBox = await findMessageBox(10000);
    typeMessage(captionBox, caption);
  }
  await clickSend();
}

function findSearchBox() {
  return document.querySelector('input[placeholder*="Search" i]') ||
    document.querySelector('input[aria-label*="Search" i]') ||
    document.querySelector('[contenteditable="true"][aria-label*="Search" i]') ||
    document.querySelector('[contenteditable="true"][data-tab="3"]');
}

function findLabeledButton(pattern) {
  return [...document.querySelectorAll('button, [role="button"]')].find((el) => {
    const label = `${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''}`;
    return pattern.test(label);
  });
}

function replaceFieldValue(field, value) {
  field.focus();
  document.execCommand('selectAll', false);
  document.execCommand('insertText', false, value);
  field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
}

async function openChatWithoutReload(number) {
  let search = findSearchBox();
  if (!search) {
    const searchButton = findLabeledButton(/search|new chat|new message/i);
    if (searchButton) searchButton.click();
    await sleep(500);
    search = findSearchBox();
  }
  if (!search) throw new Error('WhatsApp search box was not found.');
  const digits = number.replace(/\D/g, '');
  // Keep the complete country code in the search input. WhatsApp may visually
  // normalize the field, but the extension always supplies +92XXXXXXXXXX.
  replaceFieldValue(search, number);
  await sleep(1400);
  const wanted = digits.slice(-7);
  const candidates = [...document.querySelectorAll('[data-testid="cell-frame-container"], [data-testid="cell-frame"], [role="option"], [role="listitem"]')]
    .filter((el) => el.offsetParent !== null && (el.innerText || '').trim());
  const result = candidates.find((el) => (el.innerText || '').replace(/\D/g, '').includes(wanted)) ||
    // Search results often show the saved contact name instead of the digits.
    // When the search view has one visible result, that row is the requested chat.
    (candidates.length === 1 && !/no chats|no results|not found/i.test(candidates[0].innerText || '') ? candidates[0] : null);
  if (!result) throw new Error(`Number not found on WhatsApp: ${number}`);
  result.click();
  await sleep(900);
}

async function runCampaign() {
  if (busy) return;
  busy = true;
  try {
    let campaign = await getCampaign();
    if (!campaign || campaign.status !== 'running') return;
    if (campaign.currentIndex >= campaign.contacts.length) {
      campaign.status = 'completed'; await saveCampaign(campaign); return;
    }
    const index = campaign.currentIndex;
    const contact = campaign.contacts[index];
    if (campaign.results[index]?.status !== 'pending') {
      campaign.currentIndex++;
      await saveCampaign(campaign);
      setTimeout(() => runCampaign(), 0);
      return;
    }
    try {
      await openChatWithoutReload(contact.number);
      const box = await findMessageBox();
      campaign = await getCampaign();
      if (!campaign || campaign.status !== 'running') return;
      if (campaign.image) {
        await sendImage(campaign.image, campaign.message);
      } else {
        typeMessage(box, campaign.message);
        await sleep(400);
        await clickSend();
      }
      setResult(campaign, index, 'sent');
    } catch (error) {
      const status = /not found on WhatsApp/i.test(error.message) ? 'not_on_whatsapp' : 'failed';
      setResult(campaign, index, status, error.message);
    }
    campaign.currentIndex = index + 1;
    const next = campaign.currentIndex < campaign.contacts.length;
    campaign.status = next ? 'waiting' : 'completed';
    campaign.nextAt = next ? Date.now() + campaign.delaySeconds * 1000 : null;
    await saveCampaign(campaign);
    if (next) await waitForNextRecipient();
  } finally { busy = false; }
}

async function waitForNextRecipient() {
  let campaign = await getCampaign();
  if (!campaign || campaign.status !== 'waiting') return;
  while (true) {
    campaign = await getCampaign();
    if (!campaign || campaign.status === 'paused' || campaign.status === 'stopped') return;
    if (campaign.status !== 'waiting') break;
    const remaining = Math.max(0, Math.ceil((campaign.nextAt - Date.now()) / 1000));
    if (!remaining) break;
    chrome.runtime.sendMessage({ type: 'countdown', remaining, currentIndex: campaign.currentIndex, total: campaign.contacts.length }).catch(() => {});
    await sleep(1000);
  }
  campaign = await getCampaign();
  if (campaign?.status === 'waiting') {
    campaign.status = 'running';
    await saveCampaign(campaign);
    setTimeout(() => runCampaign(), 0);
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'wake' || message.type === 'running') runCampaign();
  if (message.type === 'paused' || message.type === 'stopped') busy = false;
});

(async () => {
  const campaign = await getCampaign();
  if (campaign?.status === 'running') runCampaign();
  if (campaign?.status === 'waiting' && campaign.nextAt) waitForNextRecipient();
})();
