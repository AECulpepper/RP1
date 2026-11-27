# RP1 · NAAC-X flight tracker

Personal flight tracker for a Kerbal Space Program RP-1 career (NAAC-X).

- **Site:** GitHub Pages, this repo. Holds page code only; no career data.
- **Data:** Google Drive, folder `KSP RP1 › NAAC-X`. The Sheet **NAAC-X Flight Log** is the live record; craft files are in `Craft`, telemetry CSVs in `CSV Export`.
- **Link between them:** an Apps Script web app (`apps-script/Code.gs`) running under your Google account. The page sends every request with a secret key; without it the script returns nothing.

## Files

| Path | What it is |
|---|---|
| `index.html` | The page. Until v0.2.0 a connection test; then the tracker. |
| `css/site.css` | Styles. |
| `js/config.js` | Your Google Client ID and Apps Script URL. Not secrets. |
| `js/api.js` | Talks to the Apps Script. Keeps the key and the Google sign-in in your browser only. |
| `js/auth.js` | Sign in with Google. |
| `apps-script/Code.gs` | Backend. Not used by GitHub; paste it into Apps Script. Kept here so the repo has every piece. |
| `CHANGELOG.md` | Versions. |

## How it is protected
- The page opens on **Sign in with Google**. Nothing else shows until you are signed in.
- The script answers only when a request carries **both** a Google sign-in for your account **and** your key. Any other Google account is refused.
- Your email address is not in the repo: `setup()` reads it from your Google account and stores it in the script.

## One-time setup

### A. Google sign-in (Google Cloud), about 10 minutes
1. Go to <https://console.cloud.google.com>, signed in as the account that owns the NAAC-X folder.
2. Top left, click the **project picker** → **New project**. Name `RP1 tracker` → **Create**. When it's made, pick it in the project picker so it's the active project.
3. In the search bar at the top, type `Google Auth Platform` and open it. Click **Get started**.
   1. **App information:** App name `RP1 tracker`; User support email: your Gmail → **Next**.
   2. **Audience:** **External** → **Next**.
   3. **Contact information:** your Gmail → **Next**.
   4. Tick the policy box → **Continue** → **Create**.
4. Left menu **Audience** → under **Test users** click **Add users** → enter your Gmail → **Save**. (The app stays in "Testing", so only listed users can even reach the Google sign-in.)
5. Left menu **Clients** → **Create client**.
   1. **Application type:** `Web application`.
   2. **Name:** `RP1 page`.
   3. **Authorized JavaScript origins** → **Add URI** → `https://aeculpepper.github.io` (exactly this: no `/RP1`, no slash at the end).
   4. Leave **Authorized redirect URIs** empty → **Create**.
6. Copy the **Client ID** it shows (ends in `.apps.googleusercontent.com`). You'll paste it in two places below.

### B. The Apps Script
1. Go to <https://script.google.com> → **New project** (or open `RP1 backend` if you already made it).
2. Rename it `RP1 backend` (click the title, top left).
3. In `Code.gs`, select everything, delete it, and paste the whole of `apps-script/Code.gs` from this zip. Press **Ctrl+S**.
4. Left sidebar, gear icon **Project Settings** → scroll to **Script Properties** → **Add script property**:
   - **Property:** `CLIENT_ID`
   - **Value:** the Client ID from A6
   - **Save script properties**.
5. Left sidebar **Editor** (`< >` icon). In the function dropdown pick **setup** → **Run**.
6. Allow access: **Review permissions** → your account → **Advanced** → **Go to RP1 backend (unsafe)** → **Allow**. It asks for Sheets, Drive, "connect to an external service" (to check Google sign-ins) and your email address.
7. In the **Execution log**, check:
   - **Your key …** → copy the long string after the colon and keep it private (password manager).
   - **Google account allowed to sign in:** your Gmail.
   - **Client ID is set.**
   - **Sheet:** the link to the new NAAC-X Flight Log.
8. Deploy:
   - **First time:** **Deploy** → **New deployment** → gear next to **Select type** → **Web app**. Description `v0.1.1`; **Execute as** `Me`; **Who has access** `Anyone` → **Deploy**.
   - **Already deployed v0.1.0:** **Deploy** → **Manage deployments** → pencil icon → **Version:** `New version` → **Deploy**.
9. Copy the **Web app URL** (ends in `/exec`).

### C. The site on GitHub
1. Unzip the release zip.
2. Open `js/config.js` in a text editor (Notepad is fine) and replace:
   - `PASTE_CLIENT_ID_HERE` with the Client ID from A6
   - `PASTE_SCRIPT_URL_HERE` with the Web app URL from B9
   Keep the quote marks around each value. Save.
3. At <https://github.com/AECulpepper/RP1>: if the repo is empty, click **uploading an existing file**; otherwise **Add file → Upload files**. Drag in everything from the unzipped folder (`index.html`, `css`, `js`, `apps-script`, `README.md`, `CHANGELOG.md`).
4. Check the list shows the folder names in front (e.g. `js/config.js`). Commit message `v0.1.1` → **Commit changes**.
5. First time only: repo **Settings → Pages** → **Source** `Deploy from a branch` → **Branch** `main`, `/ (root)` → **Save**. Wait 1–2 minutes.

### D. Sign in and test
1. Open <https://aeculpepper.github.io/RP1/>.
2. Click **Sign in with Google** and pick your account.
3. Paste the **key** → **Save**.
4. Run the test buttons top to bottom. Every result should be green.

## When `Code.gs` changes in a new version
1. Paste the new `Code.gs` over the old one in the Apps Script editor and save.
2. **Deploy → Manage deployments** → pencil icon → **Version: New version** → **Deploy**.
3. The URL stays the same, so the page needs no change.

Do not use **New deployment** for updates: that makes a new URL.

## Privacy notes
- Anyone can open the GitHub page, but it shows only the sign-in box, and the script refuses anyone but your Google account with your key.
- The key lives only in the browsers where you typed it. To replace it, run `newKey` in the Apps Script editor and enter the new key on the page.
- To change which Google account may sign in: Apps Script **Project Settings → Script Properties → ALLOWED_EMAIL**.
- `Code.gs` contains your Drive folder IDs. An ID alone gives no access to a private folder.
