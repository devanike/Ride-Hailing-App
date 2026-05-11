# Admin Account Setup Guide

Admins are created entirely by the developer. No signup through the app
is required or permitted. Admin accounts are created manually in the
Firebase Console.

---

## Step 1: Create the Firebase Auth Account

1. Go to the Firebase Console for your project.
2. Navigate to **Authentication > Users**.
3. Click **Add user**.
4. Enter the admin's phone number in E.164 format (e.g. +2348012345678).
   Leave the password field empty — phone auth does not use a password.
5. Click **Add user**.
6. Firebase will generate a UID for this account. Copy that UID.

---

## Step 2: Create the Admins Document in Firestore

1. Go to **Firestore Database** in the Firebase Console.
2. Open (or create) the `admins` collection.
3. Click **Add document**.
4. Set the **Document ID** to the UID copied in Step 1.
5. Add the following fields:

```
uid:          string    <the UID from Step 1>
name:         string    "Admin Name"
phone:        string    "+2348012345678"
email:        string    "admin@example.com"  (or null)
profilePhoto: null
createdAt:    timestamp (set to current time)
updatedAt:    timestamp (set to current time)
```

6. Save the document.

---

## Step 3: Admin Logs In

The admin opens the app and logs in with their phone number through the
normal login flow. The app sends an OTP to the phone number, the admin
verifies it, then sets up a PIN on first use.

After PIN setup, the root layout checks the `admins` collection for the
UID. When found, the app routes to `/(admin)`.

---

## How the App Routes Admins

After authentication, the app checks Firestore collections in this order:

1. `admins/{uid}` exists -> route to `/(admin)`
2. `drivers/{uid}` exists -> route to `/(driver)`
3. `passengers/{uid}` exists -> route to `/(passenger)`
4. None found -> route to `/(auth)/profile-setup`

The OTP verification screen also guards against accidentally creating a
passenger or driver document for a UID that already exists in `admins`.

---

## Creating Multiple Admins

Repeat Steps 1 and 2 for each admin account.

---

## Removing Admin Access

Delete the document at `admins/{uid}` in Firestore. The Firebase Auth
account can also be removed from Authentication > Users if the person
should no longer have any access.

---

## Security Notes

- Admin accounts are never created through the app signup flow.
- There is no admin registration screen in the app.
- Only developers with Firebase Console access can create or remove admins.
- Limit admin accounts to trusted staff only.
