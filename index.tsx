import { registerRootComponent } from 'expo';
import React from 'react';
import { SafeAreaView, ScrollView, Text } from 'react-native';
import { registerGlobals } from '@livekit/react-native';
import App from './App';

// Required once at startup before any LiveKit room connection is made.
registerGlobals();

// Root error boundary: without this, an uncaught error during initial render
// crashes the whole process with no on-screen feedback in a release build
// (no redbox outside dev), which looks identical to "the app won't open".
// Catching it here surfaces the actual error message/stack on-device.
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[FATAL RENDER ERROR]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text style={{ color: '#ef4444', fontSize: 16, fontWeight: '700', marginBottom: 12 }}>
              App crashed on launch
            </Text>
            <Text selectable style={{ color: '#f8fafc', fontSize: 13 }}>
              {String(this.state.error.message)}
            </Text>
            <Text selectable style={{ color: '#94a3b8', fontSize: 11, marginTop: 12 }}>
              {String(this.state.error.stack)}
            </Text>
          </ScrollView>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

// Catches fatal errors outside React's render cycle (e.g. an unhandled
// exception in a Promise or event handler during startup). Logs it before
// letting the platform's own default handler run.
declare const ErrorUtils: {
  getGlobalHandler(): (error: Error, isFatal?: boolean) => void;
  setGlobalHandler(handler: (error: Error, isFatal?: boolean) => void): void;
};
if (typeof ErrorUtils !== 'undefined') {
  const defaultHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('[GLOBAL FATAL ERROR]', isFatal, error);
    defaultHandler(error, isFatal);
  });
}

function Root() {
  return (
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  );
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App).
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Root);
