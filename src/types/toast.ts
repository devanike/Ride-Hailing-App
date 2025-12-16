export type ToastType = 'success' | 'error' | 'info' | 'warning';

export type ToastPosition = 'top' | 'bottom';

export interface ToastConfig {
  type: ToastType;
  text1: string;
  text2?: string;
  position?: 'top' | 'bottom';
  visibilityTime?: number;
  autoHide?: boolean;
  topOffset?: number;
  bottomOffset?: number;
  onPress?: () => void;
  onShow?: () => void;
  onHide?: () => void;
}

export interface ToastProps {
  text1: string;
  text2?: string;
  onPress?: () => void;
}

export interface CustomToastConfig {
  success: (props: ToastProps) => React.ReactElement;
  error: (props: ToastProps) => React.ReactElement;
  info: (props: ToastProps) => React.ReactElement;
  warning: (props: ToastProps) => React.ReactElement;
}