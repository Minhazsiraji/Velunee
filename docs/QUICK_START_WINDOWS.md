# Quick start on Windows

These steps assume Git and Node.js are installed.

## 1. Open the project

Open **PowerShell** in the Velunee folder.

```powershell
node --version
git --version
corepack enable
corepack prepare pnpm@11.11.0 --activate
pnpm --version
```

Node should be version 22.13 or newer.

## 2. Install the project

```powershell
pnpm install
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/mobile/.env.example apps/mobile/.env
```

## 3. Start the backend

Open PowerShell terminal 1:

```powershell
pnpm dev:api
```

Wait until it shows:

```text
Velunee API listening on http://localhost:4000/api/v1
```

Test it in a browser:

```text
http://localhost:4000/api/v1/health
```

## 4. Start the Android app

Open PowerShell terminal 2:

```powershell
pnpm dev:mobile
```

Use one of these methods:

- Press `a` to launch an installed Android emulator.
- Scan the Expo QR code with Expo Go on an Android phone.

For a physical phone, edit `apps/mobile/.env` and replace `localhost` with the Windows computer's local IP address:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.25:4000/api/v1
```

Find the local IP with:

```powershell
ipconfig
```

Use the IPv4 address of the active Wi-Fi adapter. Keep the phone and computer on the same Wi-Fi network.

## 5. Test the first milestone

1. Open Velunee.
2. Tap **Chat**.
3. Send `Hello Velunee`.
4. The mock provider should respond immediately.

This confirms the mobile app, API, contracts, and development authentication are connected.

## 6. Publish the branch

```powershell
git remote -v
git push -u origin main
```

Then create a pull request into `main` on GitHub.
