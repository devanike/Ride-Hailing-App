import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Passenger: NavigatorScreenParams<PassengerTabParamList>;
  Driver: NavigatorScreenParams<DriverTabParamList>;
};

export type AuthStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
  OTPVerification: { phone: string; fromSignup: boolean };
  ProfileSetup: { userId: string };
};

export type PassengerTabParamList = {
  Home: undefined;
  History: undefined;
  Profile: undefined;
};

export type DriverTabParamList = {
  Home: undefined;
  Earnings: undefined;
  Profile: undefined;
};