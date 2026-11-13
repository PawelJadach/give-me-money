# Karnet

CRM for a trainer and their clients. Polish UI. Web app and marketing site, native iOS, and a small Android client. Same Convex backend.

```
give-me-money/
  web/       marketing site (/) and the app (/app)
  ios/       SwiftUI app (open Karnet.xcodeproj)
  android/   Kotlin app
  convex/    Convex Auth and the database
```

## Auth and data

Convex is the database and backend. Sign-in is Convex Auth v2 with the username-password method. The username is the email address, so the form is email and password.

Convex Auth's email-password method will not finish sign-up until Resend sends a confirmation link from a verified domain. This version signs in immediately, on the web and from the mobile HTTP client.

Tables: users (`trainer` or `client`), trainer-client link, lesson packs, monthly passes (`paidThrough`), device tokens, notifications (in-app, email, and push status).

A trainer adds a client by email (the client registers first), sets lessons left, sets the pass date, and sends a reminder. The client sees their balance and notifications after login.

## Email and push

Reminders are stored in the app. Email goes out only when `RESEND_API_KEY` is set on the Convex deployment. With no key, email status is `skipped`. Nothing here invents that key.

Push stores a device token and a `push.deliver` action records the send. There are no push credentials.

## Run the web app

```bash
npm install
npx convex dev
```

Copy the deployment URL into `web/.env.local`:

```
VITE_CONVEX_URL=https://<deployment>.convex.cloud
```

```bash
npm run dev
```

Open http://127.0.0.1:5173 for the marketing site and http://127.0.0.1:5173/app for the app. The iOS and Android projects in this repo point at the local backend `http://127.0.0.1:3210`, which is what `npx convex dev` serves.

Put the same URL in `ios/Karnet/AppConfig.swift` and `android/app/build.gradle.kts` (`CONVEX_URL`).

## iOS

Open `ios/Karnet.xcodeproj` in Xcode 15 or newer. The app is iOS 17+. Pick your team and run.

## Android

Open `android/` in Android Studio and run the `app` module. It signs in and reads the same trainer list or client balance.
