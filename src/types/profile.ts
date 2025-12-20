// User type enumeration
export enum UserType {
  PASSENGER = 'passenger',
  DRIVER = 'driver'
}

// Profile setup data
export interface ProfileSetupData {
  email?: string;
  profilePhoto?: string;
}

// Signup data
export interface SignupData {
  name: string;
  phone: string;
  userType: 'passenger' | 'driver';
}

// OTP verification params
export interface OTPVerificationParams {
  name: string;
  phone: string;
  userType: 'passenger' | 'driver';
}