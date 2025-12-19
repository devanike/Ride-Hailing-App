import {
  PaymentMetadata,
  PaystackInitializeResponse,
  PaystackVerifyResponse,
} from '@/types/payment';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Payment Service
 * Handles Paystack card payment integration
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://paystack.com and create an account
 * 2. Complete business verification
 * 3. Go to Settings > API Keys & Webhooks
 * 4. Copy your Public Key (starts with pk_test_ or pk_live_)
 * 5. Add it to .env file
 * 
 * IMPORTANT NOTES:
 * - Money goes to your Paystack account
 * - Paystack fee: 1.5% + ₦100 per transaction
 * - Driver earnings are recorded as "pending payout"
 * - Admin manually transfers money to drivers weekly
 */

const PAYSTACK_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY;

/**
 * Initialize a card payment with Paystack
 * @param amount - Amount in Naira (kobo will be calculated)
 * @param email - Customer email
 * @param metadata - Additional payment data
 * @returns Payment reference string
 * 
 * @example
 * const reference = await initializeCardPayment(
 *   500,
 *   'passenger@example.com',
 *   { rideId: 'ride123', driverId: 'driver456', passengerId: 'pass789' }
 * );
 */
export const initializeCardPayment = async (
  amount: number,
  email: string,
  metadata: PaymentMetadata
): Promise<string> => {
  try {
    // Convert amount to kobo (Paystack uses kobo)
    const amountInKobo = amount * 100;

    // Generate unique reference
    const reference = `ride_${metadata.rideId}_${Date.now()}`;

    // Initialize payment with Paystack
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_PUBLIC_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountInKobo,
        reference,
        metadata,
        callback_url: 'uicampuscab://payment-callback', // Deep link for app
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Payment initialization failed');
    }

    const data: PaystackInitializeResponse = await response.json();

    if (!data.status) {
      throw new Error(data.message || 'Payment initialization failed');
    }

    return data.data.reference;
  } catch (error: any) {
    console.error('Error initializing payment:', error);
    throw new Error(error.message || 'Failed to initialize payment');
  }
};

/**
 * Verify a payment with Paystack
 * @param reference - Payment reference to verify
 * @returns Boolean indicating if payment was successful
 * 
 * @example
 * const isSuccessful = await verifyPayment('ride_123_1234567890');
 */
export const verifyPayment = async (reference: string): Promise<boolean> => {
  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${PAYSTACK_PUBLIC_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Payment verification failed');
    }

    const data: PaystackVerifyResponse = await response.json();

    return data.status && data.data.status === 'success';
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    throw new Error('Failed to verify payment');
  }
};

/**
 * Record a card payment in the database
 * @param rideId - Ride ID
 * @param reference - Payment reference
 * @param amount - Amount paid
 * 
 * @example
 * await recordCardPayment('ride123', 'ride_123_1234567890', 500);
 */
export const recordCardPayment = async (
  rideId: string,
  reference: string,
  amount: number
): Promise<void> => {
  try {
    // Update ride document
    const rideRef = doc(db, 'rides', rideId);
    await updateDoc(rideRef, {
      paymentStatus: 'paid',
      paymentMethod: 'card',
      paymentReference: reference,
      paidAt: serverTimestamp(),
    });

    // Create earning record with pending payout status
    // (Driver will receive money via bank transfer from admin)
    const earningRef = doc(db, 'earnings', `${rideId}_earning`);
    await setDoc(earningRef, {
      rideId,
      amount,
      paymentMethod: 'card',
      paymentReference: reference,
      payoutStatus: 'pending', // Admin will mark as 'paid' after bank transfer
      createdAt: serverTimestamp(),
    });

    console.log('Card payment recorded successfully');
  } catch (error: any) {
    console.error('Error recording payment:', error);
    throw new Error('Failed to record payment');
  }
};

/**
 * Record a cash or transfer payment in the database
 * @param rideId - Ride ID
 * @param paymentMethod - 'cash' or 'transfer'
 * @param amount - Amount paid
 * 
 * @example
 * await recordCashPayment('ride123', 'cash', 500);
 */
export const recordCashPayment = async (
  rideId: string,
  paymentMethod: 'cash' | 'transfer',
  amount: number
): Promise<void> => {
  try {
    // Update ride document
    const rideRef = doc(db, 'rides', rideId);
    await updateDoc(rideRef, {
      paymentStatus: 'paid',
      paymentMethod,
      paidAt: serverTimestamp(),
    });

    // Create earning record with 'paid' status (driver already has the money)
    const earningRef = doc(db, 'earnings', `${rideId}_earning`);
    await setDoc(earningRef, {
      rideId,
      amount,
      paymentMethod,
      payoutStatus: 'paid', // Driver already received money directly
      createdAt: serverTimestamp(),
    });

    console.log(`${paymentMethod} payment recorded successfully`);
  } catch (error: any) {
    console.error('Error recording payment:', error);
    throw new Error('Failed to record payment');
  }
};

export default {
  initializeCardPayment,
  verifyPayment,
  recordCardPayment,
  recordCashPayment,
};