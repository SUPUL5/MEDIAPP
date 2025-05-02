import { useState, useCallback } from 'react';

type AlertType = 'error' | 'success' | 'warning' | 'info';

interface AlertConfig {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
}

interface UseChatAlertsOutput {
  alertConfig: AlertConfig;
  showAlert: (type: AlertType, title: string, message: string) => void;
  hideAlert: () => void;
}

export const useChatAlerts = (): UseChatAlertsOutput => {
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    type: 'info', // Default type
    title: '',
    message: '',
  });

  const showAlert = useCallback((type: AlertType, title: string, message: string) => {
    setAlertConfig({ visible: true, type, title, message });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  }, []);

  return { alertConfig, showAlert, hideAlert };
};