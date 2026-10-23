function showCampaignBadge(campaign, countdown = null) {
  if (!campaign) {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: 'Local WhatsApp Sender' });
    return;
  }
  const total = campaign.contacts?.length || 0;
  const processed = campaign.currentIndex || 0;
  let text = '';
  let title = `${campaign.status} — ${processed}/${total}`;
  if (campaign.status === 'running') { text = 'RUN'; title = `Campaign running — ${processed}/${total}`; }
  if (campaign.status === 'waiting') { text = countdown === null ? 'WAIT' : String(countdown); title = `Waiting ${countdown ?? ''}s — next: ${processed + 1}/${total}`; }
  if (campaign.status === 'paused') { text = 'PAUSE'; title = `Campaign paused — ${processed}/${total}`; }
  if (campaign.status === 'stopped') { text = 'STOP'; title = `Campaign stopped — ${processed}/${total}`; }
  if (campaign.status === 'completed') { text = 'DONE'; title = `Campaign completed — ${total}/${total}`; }
  chrome.action.setBadgeText({ text: text.slice(0, 4) });
  chrome.action.setBadgeBackgroundColor({ color: campaign.status === 'completed' ? '#16805c' : campaign.status === 'paused' ? '#b7791f' : campaign.status === 'stopped' ? '#b42318' : '#2563eb' });
  chrome.action.setTitle({ title });
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.campaign) showCampaignBadge(changes.campaign.newValue);
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'countdown') {
    chrome.action.setBadgeText({ text: String(message.remaining).slice(0, 4) });
    chrome.action.setBadgeBackgroundColor({ color: '#2563eb' });
    chrome.action.setTitle({ title: `Waiting ${message.remaining}s — next: ${message.currentIndex + 1}/${message.total}` });
  }
});

chrome.runtime.onStartup.addListener(async () => {
  showCampaignBadge((await chrome.storage.local.get('campaign')).campaign);
});

chrome.runtime.onInstalled.addListener(async () => {
  showCampaignBadge((await chrome.storage.local.get('campaign')).campaign);
});
