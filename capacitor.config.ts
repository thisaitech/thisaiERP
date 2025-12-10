import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thisai.crm',
  appName: 'ThisAI CRM',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#3b82f6",
      showSpinner: true,
      spinnerColor: "#ffffff"
    }
  }
};

export default config;
