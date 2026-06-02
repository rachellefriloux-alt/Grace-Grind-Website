# Public Hosting And Custom Domain

Your website is built and running locally at:

```text
http://localhost:3000
```

That only works on this computer. For other people to visit it, you need two things:

1. The Node website process must stay running.
2. A public internet address must point to it.

## Keep It Running On This PC

To keep the website running after login, run this once in PowerShell:

```powershell
cd C:\Grace-Grind-Website
powershell -ExecutionPolicy Bypass -File .\INSTALL_STARTUP_TASK.ps1
```

That creates a Windows Scheduled Task named:

```text
Grace Grind Website
```

It starts the site when you log in and restarts it if the Node process exits. If Windows blocks Scheduled Task creation, the installer falls back to a launcher in your user's Startup folder.

Logs are saved here:

```text
C:\Grace-Grind-Website\logs
```

To remove the startup task later:

```powershell
cd C:\Grace-Grind-Website
powershell -ExecutionPolicy Bypass -File .\UNINSTALL_STARTUP_TASK.ps1
```

## Best Public Setup

For your situation, the cleanest self-hosted route is:

```text
Custom domain -> Cloudflare Tunnel -> this PC -> http://localhost:3000
```

Why this is the best fit:

- No router port forwarding.
- No public home IP address exposed.
- Cloudflare gives the public HTTPS address.
- Your site still runs from your own computer.

Your PC must stay on, awake, and connected to the internet.

## Custom Domain Steps

1. Buy a domain, for example:

```text
graceandgrindservices.com
graceandgrindla.com
graceandgrindalbany.com
```

2. Add that domain to Cloudflare.

3. Change the domain nameservers at your domain registrar to the nameservers Cloudflare gives you.

4. Install `cloudflared` for Windows.

5. In PowerShell or CMD, log in:

```powershell
cloudflared tunnel login
```

6. Create a tunnel:

```powershell
cloudflared tunnel create grace-grind
```

7. Route your domain to the tunnel:

```powershell
cloudflared tunnel route dns grace-grind yourdomain.com
cloudflared tunnel route dns grace-grind www.yourdomain.com
```

8. Create this config file:

```text
%USERPROFILE%\.cloudflared\config.yml
```

Use your real tunnel UUID and your real domain:

```yaml
tunnel: YOUR-TUNNEL-UUID
credentials-file: C:\Users\chell\.cloudflared\YOUR-TUNNEL-UUID.json

ingress:
  - hostname: yourdomain.com
    service: http://localhost:3000
  - hostname: www.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

9. Test it:

```powershell
cloudflared tunnel run grace-grind
```

10. Once it works, install `cloudflared` as a Windows service so the public tunnel stays active.

Cloudflare's Windows service setup expects the config in the `.cloudflared` folder and then uses:

```powershell
cloudflared.exe service install
```

## Important Reality Check

If this PC is asleep, shut down, offline, or Windows updates restart it, visitors may not reach the site. For maximum reliability, move the same project folder to a small VPS later and run it there 24/7.

The app itself is ready for either route.
