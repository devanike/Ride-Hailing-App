# Admin Account Setup Guide

## Option 1: Manual Creation in Firebase Console (Recommended)

### Why Sign Up First?

**You MUST sign up through the app first because:**
1. Firebase Authentication requires phone verification (OTP)
2. The app creates necessary security fields (PIN hash, device ID, etc.)
3. Only Firebase Admin SDK can create users without OTP (not available in app)

**The signup creates the account, then you manually UPGRADE it to admin.**

### Step 1: Sign Up Through App (Creates Base Account)
### Step 1: Sign Up Through App (Creates Base Account)
1. Open the app
2. Sign up as a **Passenger** (user type doesn't matter, you'll change it)
3. Complete the entire signup flow:
   - Enter name and phone number
   - Verify OTP code
   - Upload photo and email (optional)
   - Create PIN
   - Enable/skip fingerprint
4. **Write down your phone number** (e.g., +2348012345678)

### Step 2: Manually Upgrade to Admin in Firestore
1. Go to Firebase Console → Firestore Database
2. Find the `users` collection
3. Find your user document by phone number
4. Edit the document and update these fields:
   ```
   userType: "admin"
   isAdmin: true
   ```
5. Save changes

### Step 3: Login as Admin
1. **Logout** from the app (if logged in)
2. Close and reopen the app
3. Login with your phone number and PIN
4. App will detect `isAdmin: true` and route to admin dashboard

---

## Why This Process?

**Security Reasons:**
- Phone verification prevents fake accounts
- PIN/biometric setup ensures secure access
- No "admin signup" form = no security vulnerability
- Manual upgrade = controlled admin access

**Technical Reasons:**
- Firebase Auth requires OTP for phone numbers
- App creates security fields (PIN, device tracking)
- Only Firebase Admin SDK can bypass OTP (server-side only)

---

## Creating Multiple Admins

Repeat Steps 2-4 for each admin account you want to create.

---

## Admin Document Structure

Your admin user document should look like this:

```javascript
{
  uid: "firebase_generated_uid",
  name: "Admin Name",
  phone: "+2348012345678",
  email: "admin@uicampuscab.com",
  userType: "admin",
  profilePhoto: "cloudinary_url_or_null",
  rating: 0,
  totalRides: 0,
  isAdmin: true,  // ← THIS IS THE KEY FIELD
  
  // Security fields
  pinLastChanged: Timestamp,
  biometricEnabled: false,
  knownDevices: ["device_id"],
  failedLoginAttempts: 0,
  lockedUntil: null,
  
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

## Security Notes

1. **Never expose admin creation in the app** - admins should only be created manually
2. **Limit admin accounts** - only create for trusted staff
3. **Use strong PINs** - admins have elevated privileges
4. **Monitor admin activity** - track what admins do in the system
5. **Regular audits** - periodically review who has admin access

---

## Testing Admin Access

After setting up admin:
1. Login with admin credentials
2. You should see admin dashboard (not passenger/driver home)
3. Verify admin features work (view all rides, manage users, etc.)

---

## Troubleshooting

**Q: I updated to admin but still see passenger screen?**
- Logout and login again
- Make sure `isAdmin: true` is saved in Firestore
- Check that app checks `isAdmin` in auth flow

**Q: Can I make existing driver an admin?**
- Yes, just update their `userType` and `isAdmin` fields
- They can still access driver features if needed

**Q: How do I remove admin access?**
- Update user document: `isAdmin: false, userType: "passenger"` or `"driver"`