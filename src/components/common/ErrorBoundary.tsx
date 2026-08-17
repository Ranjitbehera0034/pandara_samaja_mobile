// src/components/common/ErrorBoundary.tsx
//
// The app had no error boundary at all — any uncaught render-time
// exception anywhere (a bad prop, a native module throwing during setup,
// etc.) took down the entire app instead of failing gracefully. Error
// boundaries can only be class components; there is no hook equivalent.
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface Props {
  children: React.ReactNode;
  // Custom fallback UI, e.g. so a specific screen can recover to "closed"
  // instead of showing the generic app-wide error card.
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  // Called once when an error is caught — e.g. to also close a modal that
  // wraps the crashing content, so retrying doesn't just re-mount the
  // same broken screen immediately.
  onError?: (error: Error) => void;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught a render error:', error, info.componentStack);
    this.props.onError?.(error);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      return (
        <View style={{ flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}>
            Something went wrong
          </Text>
          <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
            {this.state.error.message || 'An unexpected error occurred.'}
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ error: null })}
            style={{ backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
