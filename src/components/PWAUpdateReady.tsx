// src/components/PWAUpdateReady.tsx
import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

export const PWAUpdateReady = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  React.useEffect(() => {
    if (offlineReady) {
      toast.info('App is ready to work offline.');
    }
  }, [offlineReady]);

  React.useEffect(() => {
    if (needRefresh) {
      toast.info('New content available, click on reload button to update.', {
        action: {
          label: 'Reload',
          onClick: () => {
            updateServiceWorker(true);
          },
        },
        duration: 10000, // Keep the toast open for 10 seconds
        onDismiss: () => close(),
      });
    }
  }, [needRefresh, updateServiceWorker]);

  return null; // This component does not render anything itself
};
