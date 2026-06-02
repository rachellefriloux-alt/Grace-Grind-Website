# Grace & Grind Self Hosting

This copy is independent from Polsia. Build it, run it, and point your own domain at the server.

## Local Run

Double-click `START_WEBSITE.bat`, or run:

```powershell
cd C:\Grace-Grind-Website
npm install --legacy-peer-deps
npm run build
npm start
```

Open:

```text
http://localhost:3000
```

## Booking Requests

The booking form posts to your own server at:

```text
/api/bookings
```

Requests are saved locally here by default:

```text
C:\Grace-Grind-Website\data\bookings.jsonl
```

The file is created automatically after the first real booking request.

To store them somewhere else:

```powershell
$env:BOOKINGS_FILE="C:\Grace-Grind-Website\data\bookings.jsonl"
npm start
```

## Hosting Publicly

On a VPS or home server, install Node.js, copy this folder over, run the build commands, then keep `npm start` running with a process manager such as PM2 or Windows Task Scheduler.

The app listens on `PORT` if set, otherwise port `3000`.

For the Windows keep-running script and custom domain path, read:

```text
PUBLIC_HOSTING.md
```
