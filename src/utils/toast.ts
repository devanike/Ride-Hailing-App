import Toast from 'react-native-toast-message';

/**
 * Toast utility functions for displaying notifications
 * Uses react-native-toast-message library
 */

/**
 * Show success toast notification
 * @param title - Main message title
 * @param message - Optional detailed message
 * 
 * @example
 * showSuccess('Login Successful', 'Welcome back!');
 */
export const showSuccess = (title: string, message?: string): void => {
  Toast.show({
    type: 'success',
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: 3000,
    autoHide: true,
    topOffset: 50,
  });
};

/**
 * Show error toast notification
 * @param title - Main error message
 * @param message - Optional error details
 * 
 * @example
 * showError('Login Failed', 'Invalid credentials');
 */
export const showError = (title: string, message?: string): void => {
  Toast.show({
    type: 'error',
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: 4000,
    autoHide: true,
    topOffset: 50,
  });
};

/**
 * Show info toast notification
 * @param title - Main info message
 * @param message - Optional additional info
 * 
 * @example
 * showInfo('New Feature', 'Check out our new ride tracking!');
 */
export const showInfo = (title: string, message?: string): void => {
  Toast.show({
    type: 'info',
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: 3000,
    autoHide: true,
    topOffset: 50,
  });
};

/**
 * Show warning toast notification
 * @param title - Main warning message
 * @param message - Optional warning details
 * 
 * @example
 * showWarning('No Internet', 'Please check your connection');
 */
export const showWarning = (title: string, message?: string): void => {
  Toast.show({
    type: 'error', // Using error type for warning (styled as orange)
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: 3500,
    autoHide: true,
    topOffset: 50,
  });
};

// Hide all toast notifications
export const hideToast = (): void => {
  Toast.hide();
};

// Export all functions as default object
export default {
  showSuccess,
  showError,
  showInfo,
  showWarning,
  hideToast,
};