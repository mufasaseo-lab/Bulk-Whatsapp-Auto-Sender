# Auto Sender WhatsApp

WhatsApp contacts ko organize karne aur future mein automated messaging workflow ke liye project workspace.

## Current project status

**MVP development started.** Local Chrome Extension ka first implementation `extension/` folder mein available hai. Yeh abhi development MVP hai; production reliability aur WhatsApp Web UI compatibility ki guarantee nahi hai.

## Files

| File | Description |
| --- | --- |
| `contacts_list.xlsx` | WhatsApp contacts ki Excel list |
| `README.md` | Project documentation, data format aur development prompt |
| `extension/` | Local Chrome Extension MVP |
| `package.json` | Local Excel parser dependency metadata |

## Contact workbook

`contacts_list.xlsx` mein `Contacts` naam ki sheet hai:

| Column | Purpose |
| --- | --- |
| `Sr. No.` | Contact ka serial number |
| `Contact Name` | Contact/person ka naam |
| `Phone Number` | International format mein phone number, example: `+923xxxxxxxxx` |

Current workbook mein 167 contacts hain. Phone numbers ko international format mein rakhna zaroori hai; spaces, duplicate numbers aur invalid numbers ko automation se pehle validate karna chahiye.

## Recommended next steps

1. Messaging requirements define karein: message text, variables, attachments aur scheduling.
2. Contacts ki validation aur duplicate detection add karein.
3. WhatsApp sending method select karein, jaise official WhatsApp Business/Cloud API ya approved provider.
4. Dry-run/preview mode banayein taake messages send karne se pehle verify kiye ja saken.
5. Sending logs, retry handling, rate limits aur opt-out support add karein.

> Automated messaging sirf un contacts ko bheji jaye jinhon ne consent diya ho. WhatsApp ki policies aur applicable laws follow karein.

## Data handling notes

- `contacts_list.xlsx` mein personal phone numbers hain; is file ko public repository ya unsecured location par upload na karein.
- Real messages send karne se pehle test contacts aur dry-run use karein.
- Message logs mein zaroorat se zyada personal data store na karein.

## User ka proposed idea

User ka initial idea yeh hai:

- Application local computer par chale.
- Browser mein pehle se logged-in `web.whatsapp.com` tab ko use kiya jaye.
- Excel file se diye gaye phone numbers read kiye jayen.
- Application mein custom message ke liye ek text box ho.
- Wohi message Excel ke numbers ko one-by-one bheja jaye.
- Do messages ke darmiyan default gap 19 seconds ho.
- User timer ko 19 seconds se zyada kar sake, lekin 19 seconds se kam set na kar sake.
- Pehle idea discuss aur approve hoga; us ke baad hi implementation start hogi.

## Initial product suggestion

Meri recommendation hai ke final application mein sirf basic “send” button na ho, balkay yeh safeguards bhi hon:

- **Preview aur validation:** send se pehle total recipients, invalid/duplicate numbers aur message ka preview.
- **Mandatory minimum delay:** timer ki minimum value hard limit ke taur par 19 seconds ho; invalid value accept na ho.
- **Pause/resume/stop:** user campaign ko pause, resume ya foran stop kar sake.
- **Progress aur logs:** har number ka status—pending, sent, skipped ya failed—aur failure reason.
- **Test mode:** pehle sirf ek selected test number par message verify karne ka option.
- **Opt-out list:** jis contact ne mana kiya ho usay future sends se automatically skip kiya jaye.
- **Safe restart:** app band hone par campaign dobara start karne se pehle duplicate sends se bachne ke liye progress save ho.
- **Sensitive data protection:** Excel file aur logs local rahen; API/session credentials code mein hard-code na hon.

### Browser tab approach ka trade-off

Logged-in WhatsApp Web tab ko automate karna user ke desired workflow ke qareeb hai, lekin browser UI change hone par fragile ho sakta hai, login/session issues aa sakte hain aur account restriction ka risk rehta hai. Official WhatsApp Business/Cloud API zyada stable aur supportable option hota hai, lekin us mein setup, business verification, approved templates aur possible costs aa sakte hain.

Is liye implementation se pehle yeh decision approve karna hoga:

1. **Local browser workflow:** existing WhatsApp Web session use kare; setup simple, magar maintenance aur account-risk zyada.
2. **Official WhatsApp Business API:** zyada reliable/compliant; setup aur cost comparatively zyada.

Default recommendation: agar messages opted-in contacts ko business use case mein bhejne hain to official API evaluate ki jaye. Agar personal/local internal workflow ke liye browser approach choose ki jaye to test mode, strict delay, stop control aur consent/opt-out safeguards mandatory hon.

## Approval gate

Abhi implementation start nahi karni. User ki approval ke baad hi selected approach, exact screens, Excel format aur sending workflow ko finalize karke development shuru ki jayegi. Har approved change aur implementation milestone is README mein update hoga.

## Approved product direction

User ne recommended safeguards approve kar diye hain:

1. Excel se numbers read karna.
2. Send se pehle preview, invalid-number check aur duplicate check.
3. Delay ki hard minimum limit 19 seconds; user is se zyada delay set kar sakta hai.
4. Pause, resume aur emergency stop controls.
5. Har recipient ka sent/failed/skipped status log.
6. Pehle ek test number par test mode.
7. Opt-out list, taake mana karne walay contacts skip hon.
8. Restart ke baad duplicate sending se protection.
9. Existing logged-in browser ke WhatsApp Web tab ko use karna.
10. Start se pehle consent/risk popup, jisme account restriction ke possible risk ko clearly explain kiya jaye aur user ki confirmation li jaye.

## Tech-stack decision (planning)

### Recommended: Chrome Extension (Manifest V3)

Yeh approach is use case ke liye sab se suitable hai, kyunki extension directly us Chrome tab ke saath kaam kar sakti hai jahan user ne `web.whatsapp.com` login kiya hua hai.

Suggested components:

- **Chrome Extension Manifest V3:** popup, settings aur controls ke liye.
- **HTML/CSS/JavaScript:** simple local interface ke liye; beginner-friendly aur lightweight.
- **Content script:** WhatsApp Web tab ke saath interaction ke liye.
- **SheetJS (local bundled copy):** `.xlsx` file read karne ke liye.
- **Chrome Storage/IndexedDB:** settings, opt-out list, campaign progress aur logs ko local save karne ke liye.

Extension ko Chrome ke “Load unpacked” option se local use kiya ja sakta hai; kisi ko publish ya sell karne ki zaroorat nahi hogi.

### Alternatives

- **Web application:** recommended nahi, kyunki normal web app security reasons ki wajah se aapke existing WhatsApp Web tab ko reliably control nahi kar sakti.
- **Desktop application:** dashboard aur local storage ke liye achi ho sakti hai, lekin existing Chrome tab se connect karna zyada complex hoga. Isay future mein optional companion app banaya ja sakta hai.
- **Electron + Playwright:** technically possible, lekin is mein apna browser/session manage karna padega aur aapke existing logged-in Chrome tab ka direct use natural nahi hoga.

### Important limitation

Chrome extension WhatsApp Web ke visible interface ke saath kaam karegi. WhatsApp Web ke UI changes se automation kabhi kabhi update mang sakti hai. Extension mein risk popup, test mode, 19-second hard limit, stop control aur local logs ko mandatory rakha jayega. Yeh tool WhatsApp account restriction ko prevent ya guarantee nahi kar sakta.

Implementation start karne se pehle final scope Chrome Extension (Manifest V3) ke liye lock kiya gaya tha, aur initial MVP ab bana diya gaya hai.

## MVP features implemented

- `.xlsx`, `.xls` aur `.csv` import.
- Phone number normalization, invalid number detection aur duplicate detection.
- Pakistan numbers ko Excel/manual input/search mein complete `+92...` country-code format mein normalize karna.
- Message preview aur recipient count.
- Message editor toolbar: bold, italic, strikethrough, monospace aur explicit line break insertion.
- Optional image upload; image select hone par message image caption ke taur par send hota hai, warna text-only send hota hai.
- Message insertion mein line breaks aur repeated spaces preserve karne ki handling.
- 19 seconds ki hard minimum delay; UI mein clear safety notification hai aur chhoti value allow nahi hoti. Yeh app ki safety setting hai, WhatsApp ki guaranteed policy-safe timing nahi.
- Test mode mein comma, semicolon ya new line se multiple manual test numbers enter karke Excel ke baghair test kiya ja sakta hai.
- Test mode default mein disabled hai; normal startup Excel campaign ke liye hota hai.
- Pause, resume aur emergency stop controls.
- Sent, failed aur pending status logs.
- WhatsApp search result na milne par clear `not_on_whatsapp` status aur error reason.
- Preview table campaign result ke mutabiq har number ka current status bhi show karti hai.
- Local campaign progress save, taake browser/page restart ke baad duplicate sending kam ho.
- Opt-out numbers ko skip karna.
- Start se pehle risk/consent checkbox.
- Existing `web.whatsapp.com` tab ke saath guarded interaction.
- Next recipient ko same WhatsApp Web tab ke internal search/new-chat UI se open karna; full-tab URL reload avoid karna.
- Popup band hone ke baad extension icon badge par campaign state/progress/countdown indicator.
- Popup dobara khulne par active campaign ki message, delay, recipients, preview aur controls restore; active campaign ke dauran duplicate Start disabled.

## Local installation

1. Chrome mein `chrome://extensions` open karein.
2. **Developer mode** enable karein.
3. **Load unpacked** select karein.
4. Is project ka `extension` folder select karein.
5. `web.whatsapp.com` par login karein.
6. Extension icon open karke pehle test mode mein ek test number use karein.

Agar extension install/reload ke waqt WhatsApp Web tab pehle se open tha, extension popup se dobara **Start** karne par content script automatically inject hone ki koshish karegi. Agar connection error phir bhi aaye to `web.whatsapp.com` tab reload karke extension ko bhi reload karein.

### Doosre PC par installation

1. `Local WhatsApp Sender.zip` ko doosre PC par copy karein.
2. ZIP ko extract karein; ZIP file ko directly Chrome mein load na karein.
3. Extracted folder ke andar `manifest.json` directly hona chahiye.
4. Chrome mein `chrome://extensions` open karke Developer mode enable karein.
5. **Load unpacked** select karein aur wohi folder choose karein jisme `manifest.json` directly موجود ho.

Correct folder structure:

```text
Local WhatsApp Sender/
├── manifest.json
├── popup.html
├── popup.js
├── content.js
├── background.js
├── icons/
└── vendor/
```

### `Manifest file is missing or unreadable` fix

- Parent folder select na karein; inner folder select karein jisme `manifest.json` ho.
- ZIP ko extract karke **Load unpacked** use karein.
- Confirm karein file ka naam exactly `manifest.json` ho, `manifest.json.txt` nahi.
- `Local WhatsApp Sender.zip` mein extension files root level par packaged hain.

Extension ko reload karne ke baad campaign state local storage mein reh sakti hai, lekin active campaign se pehle status aur logs verify karna zaroori hai.

## MVP limitations

- WhatsApp Web ke visible UI selectors par dependency hai; WhatsApp UI change hone par content script update karni pad sakti hai.
- Extension account restriction, logout, delivery ya successful send ki guarantee nahi deti.
- Browser tab khula, logged-in aur stable internet connection ke saath rehna chahiye.
- Failed message ko automatically aggressive retry nahi kiya jata; log mein failed status record hota hai.
- Real recipient list par use se pehle test mode aur consent/opt-out list verify karni hogi.

## Development verification

- `node --check extension/popup.js` passed.
- `node --check extension/content.js` passed.
- `contacts_list.xlsx` successfully parsed: 167 data rows.

## Development log

- **2026-10-23:** Chrome Extension Manifest V3 MVP scaffolded; local XLSX parser bundled; import, validation, preview, consent, delay guard, controls, logs, opt-out handling aur restart-safe campaign state add kiye gaye.
- **2026-10-23:** Existing WhatsApp tabs ke liye content-script connection fallback aur connection failure par automatic campaign pause add kiya gaya.
- **2026-10-23:** Imported contacts ko extension local storage mein persist/restore kiya gaya, taake popup ya extension reload ke baad Excel dobara select na karni pade.
- **2026-10-23:** Message editor formatting toolbar aur WhatsApp Web insertion fix add kiya gaya; line breaks/repeated spaces preserve karne ki handling improve hui.
- **2026-10-23:** Multi-recipient campaign mein second recipient stuck hone ka scheduling-lock bug fix kiya gaya; next recipient ab delay ke baad queued run se process hoga.
- **2026-10-23:** Preview rows ko campaign results se connect kiya gaya; sent/failed/pending status preview mein update hota hai.
- **2026-10-23:** Recipient switching ko URL navigation se WhatsApp Web internal search flow par shift kiya gaya, taake next number ke liye full tab reload na ho.
- **2026-10-23:** Search results mein number ki jagah saved contact name show hone par false `not found` error fix kiya gaya; visible contact row select hoti hai.
- **2026-10-23:** Missing WhatsApp number ke liye `not_on_whatsapp` status aur next-number delay continuation add ki; background badge/countdown indicator add kiya.
- **2026-10-23:** Pakistan phone normalization add ki gayi; `03...`, `3...`, `92...` aur `+92...` inputs ko complete `+92...` format mein convert kiya jata hai.
- **2026-10-23:** Popup reopen par active campaign restore aur duplicate Start protection add ki gayi; running/waiting/paused campaign ke liye Pause, Resume aur Emergency Stop controls available rehte hain.
- **2026-10-23:** Default toolbar icon ko colorful `W` alphabet icon se replace kiya gaya; 16/32/48/128 PNG sizes add kiye gaye.
- **2026-10-23:** Waiting campaign reload-resume, specific message-box selection, ambiguous search-result protection aur processed-contact recursion fixes add kiye gaye.
- **2026-10-23:** Optional image attachment add ki gayi; maximum image size 5 MB aur image ke saath message caption support.

## Deferred: Excel status sync

User ne loaded Excel workbook mein sending result update karne ka option discuss kiya tha. Yeh feature abhi **deferred** hai; current MVP mein Excel file modify/export nahi ki ja rahi.

Future mein implement karte waqt browser security ki wajah se original file ko silently overwrite nahi kiya ja sakega; save action par user permission/click required hoga.

Suggested workbook columns:

- `Status`: `pending`, `sent`, `failed`, `duplicate`, `not_on_whatsapp`, `skipped`
- `Error`: failure ya skip reason
- `Sent At`: successful send ka local timestamp
- `Last Checked`: last processing/check timestamp

Recommended default behavior: original file ko safe rakhte huway `contacts_list_status.xlsx` naam ki updated copy save ki jaye. Is se original data recoverable rahega. Optional advanced action ke taur par user permission ke baad original workbook overwrite ki ja sakti hai.

Important: duplicate rows ko detect karne ke liye importer ko original Excel rows preserve karni hongi; current MVP unique recipients ko campaign list mein rakhta hai. WhatsApp par number registered hai ya nahi, is status ko reliably detect karna bhi UI response par depend karega aur `not_on_whatsapp` result hamesha guaranteed nahi hoga.

## Project prompt

Original user request:

> `readme.md ki file create karo or sub is main update karo, mera prompt bhi`

Is prompt ka matlab hai ke project ke liye `README.md` create/update ki jaye aur user ka prompt bhi documentation mein include kiya jaye.

## Development prompt

Future implementation ke liye yeh prompt use kiya ja sakta hai:

> Is project ke liye ek safe aur maintainable WhatsApp contact messaging workflow banao. `contacts_list.xlsx` se contacts read karo, phone numbers validate karo, duplicates identify karo, message preview/dry-run provide karo, aur sirf opted-in contacts ko approved WhatsApp API/provider ke zariye messages send karo. Scheduling, rate limiting, retry handling, delivery status, error logs aur opt-out support include karo. Secrets ko source code ya Excel file mein hard-code na karo. Har change ke baad setup aur usage ko `README.md` mein update karo.

## Security

- API tokens, passwords aur session data ko `.env` ya secure secret manager mein rakhein.
- `.env`, message logs aur exported personal data ko version control mein commit na karein.
- Production use se pehle backup aur recovery process define karein.
