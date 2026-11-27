import { Alert, Platform } from 'react-native';

/**
 * Asks the user to confirm an action. Alert.alert does nothing on the web, so
 * the web build uses the browser's confirm dialog instead.
 */
export function confirmAction(title: string, message: string, actionLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'إلغاء', style: 'cancel' },
    { text: actionLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

/** Shows a message. Uses the browser's alert on the web. */
export function notice(title: string, message: string) {
  if (Platform.OS === 'web') {
    globalThis.alert?.(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
