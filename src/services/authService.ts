import {
  ConfirmationResult,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  Unsubscribe,
  User,
  UserCredential,
} from 'firebase/auth';
import { auth } from './firebaseConfig';

/**
 * Auth Service
 * Handles Firebase Authentication with Phone Number
 */

// Store recaptcha verifier instance
let recaptchaVerifier: RecaptchaVerifier | null = null;

/**
 * Initialize reCAPTCHA verifier (for web/testing)
 * Note: For production React Native, you'll need to configure
 * Firebase Auth to work without reCAPTCHA or use a different method
 */
export const initializeRecaptcha = (containerId: string): void => {
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        console.log('reCAPTCHA verified');
      },
      'expired-callback': () => {
        console.log('reCAPTCHA expired');
      },
    });
  }
};

/**
 * Send OTP to phone number
 * @param phoneNumber - Phone number in E.164 format (e.g., +2348012345678)
 * @returns ConfirmationResult for OTP verification
 * 
 * @example
 * const confirmationResult = await sendPhoneOTP('+2348012345678');
 */
export const sendPhoneOTP = async (
  phoneNumber: string
): Promise<ConfirmationResult> => {
  try {
    if (!phoneNumber.startsWith('+')) {
      throw new Error('Phone number must be in E.164 format (e.g., +2348012345678)');
    }

    const confirmationResult = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      recaptchaVerifier!
    );

    return confirmationResult;
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    throw new Error(error.message || 'Failed to send OTP');
  }
};

/**
 * Verify OTP code
 * @param confirmationResult - Result from sendPhoneOTP
 * @param code - 6-digit OTP code
 * @returns UserCredential
 * 
 * @example
 * const userCredential = await verifyOTP(confirmationResult, '123456');
 */
export const verifyOTP = async (
  confirmationResult: ConfirmationResult,
  code: string
): Promise<UserCredential> => {
  try {
    const userCredential = await confirmationResult.confirm(code);
    return userCredential;
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    throw new Error('Invalid OTP code');
  }
};

/**
 * Get current authenticated user
 * @returns Current user or null
 * 
 * @example
 * const user = getCurrentUser();
 * if (user) {
 *   console.log('User ID:', user.uid);
 * }
 */
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

/**
 * Logout current user
 * 
 * @example
 * await logout();
 */
export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error('Error logging out:', error);
    throw new Error('Failed to logout');
  }
};

/**
 * Listen to auth state changes
 * @param callback - Function to call when auth state changes
 * @returns Unsubscribe function
 * 
 * @example
 * const unsubscribe = onAuthStateChanged((user) => {
 *   if (user) {
 *     console.log('User logged in:', user.uid);
 *   } else {
 *     console.log('User logged out');
 *   }
 * });
 * 
 * // Later, to stop listening:
 * unsubscribe();
 */
export const onAuthStateChanged = (
  callback: (user: User | null) => void
): Unsubscribe => {
  return firebaseOnAuthStateChanged(auth, callback);
};

export default {
  initializeRecaptcha,
  sendPhoneOTP,
  verifyOTP,
  getCurrentUser,
  logout,
  onAuthStateChanged,
};