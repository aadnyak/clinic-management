# Clinic Management System (Firebase)

## Overview
Web-based clinic management demo with Doctor & Receptionist roles. Built with HTML/CSS/JS and Firebase (Auth & Firestore). Supports token generation, patient records, prescription saving, billing generation, and action logging.

## Run locally
1. Create Firebase project, enable Auth & Firestore.
2. Replace firebaseConfig in `app.js` & `dashboard.js`.
3. Serve folder: `python -m http.server 8000`, open `http://localhost:8000/index.html`.
4. Register users and test receptionist & doctor flows.

## Deploy
Use Firebase Hosting: `firebase init` → `firebase deploy`.

## Notes
- Firestore rules included are for development only. Harden rules in production using role checks.
