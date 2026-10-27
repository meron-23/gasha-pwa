# Sara's recordings

Put MP3 files here with these names. The app plays a file as soon as it exists; until then the player runs on the script length.

| Where in the app | File name |
|---|---|
| Lesson 1.1 … 10.x | `lesson-1.1.mp3` … (one per lesson id in content.json) |
| Question answers | `qa-A1.mp3` … `qa-H6.mp3` (question id) |
| Calm yourself first (breathing) | `calm.mp3` |
| Right-now opening line | `now-1.mp3` … `now-16.mp3` |
| Onboarding "Listen" buttons | `ob-role.mp3`, `ob-stage.mp3`, … (step key) |
| Privacy in plain words | `privacy.mp3` |
| Monthly check-in questions | `checkin-1.mp3` … `checkin-6.mp3` |

After adding files, run `python3 tools/build-sw.py` (not required for audio, but it bumps the version so phones refresh).
