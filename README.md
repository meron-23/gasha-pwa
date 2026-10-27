# Gasha (ጋሻ) · parent app PWA

The parent app as an installable Progressive Web App. It's a static site: no build step, no framework and no server code. It's Amharic first with English on every screen, and it keeps working without internet after the first visit.

## Run it locally

```bash
cd gasha-pwa
python3 -m http.server 8080        # or: npx serve .
# open http://localhost:8080
```

Service workers need `localhost` or HTTPS, so opening `index.html` straight from the file system won't install the app.

## Deploy (any static host over HTTPS)

Upload the whole folder as it is. Any of these work with zero config:

- **Netlify:** drag the folder onto https://app.netlify.com/drop
- **Vercel:** `npx vercel` inside the folder (https://vercel.com/docs/cli)
- **Cloudflare Pages:** https://developers.cloudflare.com/pages/ ("Direct Upload")
- **GitHub Pages:** push the folder and turn Pages on (https://pages.github.com)

The app uses relative paths, so it also works from a sub-folder (e.g. `example.com/gasha/`).

**Headers.** No special headers are needed. If you can set them, serve `sw.js` with `Cache-Control: no-cache` so updates reach phones quickly.

## Before showing the client

1. Open `js/config.js` and fill in:
   - the Guys center phone number and Telegram link
   - `publicUrl` (used in the links people share)
   - the emergency numbers, after confirming them
2. Open the deployed site on an Android phone in Chrome. You should get the "Install" prompt, or use ⋮ › Install app. On iPhone, use Safari › Share › Add to Home Screen.
3. Turn on airplane mode and reopen the app to check that it works offline.

## Every screen has its own link

These are useful for the demo, for QR codes and for shared links. The back button on the phone works everywhere.

| Area | Links |
|---|---|
| Start | `#/welcome` · `#/ob?k=role` (then `stage`, `age`, `child`, `challenges`, `city`, `center`, `account`, `verify`, `ready`) · `#/login` |
| Today | `#/home` · `#/path` · `#/log` · `#/mychild` · `#/checkin?i=0` · `#/events` · `#/event?i=0` |
| Courses | `#/courses` · `#/course?id=1` … `id=10` · `#/lesson?id=3.2` · `#/lessondone?id=3.2` · `#/coursedone?id=3` · `#/shared?id=2.1` (the page family members see) |
| Help now | `#/now` · `#/allnow` · `#/calm?id=0` (breathing only) · `#/calm?id=1` … `id=16` · `#/step?id=5&n=0` · `#/after?id=5` · `#/safety` · `#/idcard` |
| Questions | `#/questions` · `#/topic?id=A` … `H` · `#/answer?id=E4` · `#/search` · `#/ask` |
| Find help | `#/help` · `#/place?i=0` … `i=28` · `#/signs` · `#/signsresult` · `#/doctor` · `#/big?k=doctor` · `#/big?k=notes` |
| Profile | `#/profile` · `#/editprofile` · `#/kids` · `#/editkid?i=0` · `#/downloads` · `#/install` · `#/messages` · `#/privacy` · `#/about` · `#/states` |

To restart the demo, go to Profile › "Log out" or "Delete my account". Both clear everything on the phone.

## What each button does in this version

| Button | What happens |
|---|---|
| Call (emergency, center, places, family) | Opens the phone dialer (`tel:` links). Numbers come from `config.js` and `content.json`. |
| Share (lessons, answers, places, notes, the app) | Opens the phone's share sheet (Telegram, WhatsApp, SMS). If the browser has no share sheet, it opens Telegram's share page. |
| Directions | Opens Google Maps with a search for the place. |
| Remind me tonight / event reminder | Downloads a calendar file (`.ics`) with an alarm, which the phone adds to its calendar. |
| Listen / play | Plays `audio/<id>.mp3` when it exists (see `audio/README.md`). Until Sara records it, a timed player runs. |
| Save offline | Saves that course's pictures and audio on the phone. Profile › Downloaded lessons shows the space used and can clear it. |
| Ask a question | Kept on the phone and shown under "My questions". If `questionEndpoint` is set in `config.js`, it is also POSTed there as JSON (and retried when the phone is back online). |
| SMS code screen | Demo only: no SMS is sent and the code is filled in for you (`config.demo.otp`). |
| Print ID card | Opens the print dialog with only the card. |
| Download my data | Downloads a JSON file with everything the parent entered. |
| Install Gasha | Shows the install prompt on Android and Chrome desktop, and the steps on iPhone. |

## Where things live

```
index.html            page shell
manifest.webmanifest  install name, icons, shortcuts (long-press the icon: Help now, Emergency…)
sw.js                 offline cache (run tools/build-sw.py after changing files)
content.json          ALL text: onboarding, 10 courses / 49 lessons, 16 guides, 50 answers, 29 places, 40 tips, every screen
js/config.js          phone numbers, endpoints, demo settings
js/core.js            storage, share, reminders, install, start-up
js/app.js             every screen (search for "SCR.<name>")
js/icons.js           icon set + logo
css/app.css           styles (fonts bundled in /fonts for offline use)
art/                  79 illustrations (SVG)
audio/                Sara's recordings (empty for now)
```

Everything a parent types (child's name, notes, check-ins) is stored only in the phone's `localStorage`, under keys starting with `gasha.`.

## Not in this version (needs a backend later)

- Real SMS login and accounts across phones
- Sara's answers arriving in the app (the admin panel is a separate project)
- SMS reminders being sent (the texts are on Profile › See the messages we send)
- Event sign-ups reaching the center (they're kept on the phone)
