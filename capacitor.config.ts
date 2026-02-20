import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thisai.erp',
  appName: 'ThisAI ERP',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#3b82f6",
      showSpinner: true,
      spinnerColor: "#ffffff"
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#1f4fd6"
    }
  }
};

export default config;
