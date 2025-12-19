// Onboarding slide data structure
export interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  image: any; // require() import
}

// Onboarding navigation params
export interface OnboardingParams {
  skipOnboarding?: boolean;
}