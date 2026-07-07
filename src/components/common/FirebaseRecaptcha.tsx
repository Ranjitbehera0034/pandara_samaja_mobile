// src/components/common/FirebaseRecaptcha.tsx
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View, Modal, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';

export interface FirebaseRecaptchaProps {
  onEvent: (event: any) => void;
  isVisible: boolean;
  onClose?: () => void;
}

export interface FirebaseRecaptchaRef {
  injectMessage: (data: any) => void;
}

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const HTML_CONTENT = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    body, html {
      margin: 0; padding: 0; width: 100%; height: 100%;
      background-color: #0f172a;
      display: flex; justify-content: center; align-items: center;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #recaptcha-container {
      transform: scale(1.1);
      transform-origin: center;
      margin: auto;
    }
    #status-text {
      position: absolute;
      bottom: 20px;
      font-size: 14px;
      color: #94a3b8;
      text-align: center;
      width: 100%;
    }
  </style>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>
</head>
<body>
  <div id="recaptcha-container"></div>
  <div id="status-text">Verifying connection...</div>

  <script>
    function sendToRN(data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    }

    let confirmationResult = null;
    let auth = null;

    function setStatus(text) {
      document.getElementById('status-text').innerText = text;
    }

    window.onerror = function(message, source, lineno, colno, error) {
      sendToRN({ type: 'error', message: message + " (line " + lineno + ")" });
      return true;
    };

    // Listen for messages from React Native.
    // react-native-webview delivers postMessage() on "window" on iOS but
    // only on "document" on Android, so both must be registered.
    function handleRNMessage(event) {
      if (typeof event.data !== 'string') return;
      
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (err) {
        // Silently ignore parse errors for third-party or iframe internal messages
        return;
      }
      
      if (!data || !['init', 'sendOtp', 'verifyOtp'].includes(data.type)) {
        return;
      }

      try {
        if (data.type === 'init') {
          setStatus('Initializing verification...');
          const config = data.config;
          const app = firebase.initializeApp(config);
          auth = firebase.auth(app);

          window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
            size: data.recaptchaSize || 'invisible',
            callback: function(token) {
              sendToRN({ type: 'recaptchaSolved', token: token });
              setStatus('Sending security confirmation...');
            },
            'expired-callback': function() {
              sendToRN({ type: 'recaptchaExpired' });
              setStatus('Security verification expired. Try again.');
            }
          });
          
          sendToRN({ type: 'ready' });
          setStatus('');
        } else if (data.type === 'sendOtp') {
          setStatus('Requesting verification SMS...');
          const phoneNumber = data.phoneNumber;
          auth.signInWithPhoneNumber(phoneNumber, window.recaptchaVerifier)
            .then(function(result) {
              confirmationResult = result;
              sendToRN({ type: 'otpSent' });
              setStatus('SMS sent successfully!');
            })
            .catch(function(err) {
              sendToRN({ type: 'sendOtpError', message: err.message, code: err.code });
              setStatus('Failed to send SMS.');
            });
        } else if (data.type === 'verifyOtp') {
          setStatus('Verifying security code...');
          const code = data.code;
          if (!confirmationResult) {
            sendToRN({ type: 'verifyOtpError', message: 'Verification session expired. Please request a new code.' });
            setStatus('Session expired.');
            return;
          }
          confirmationResult.confirm(code)
            .then(async function(userCredential) {
              setStatus('Code accepted! Authenticating...');
              const idToken = await userCredential.user.getIdToken();
              sendToRN({ type: 'otpVerified', idToken: idToken });
            })
            .catch(function(err) {
              sendToRN({ type: 'verifyOtpError', message: err.message, code: err.code });
              setStatus('Incorrect code.');
            });
        }
      } catch (err) {
        sendToRN({ type: 'error', message: 'Exception: ' + err.message });
      }
    }

    document.addEventListener('message', handleRNMessage);
    window.addEventListener('message', handleRNMessage);
  </script>
</body>
</html>
`;

export const FirebaseRecaptcha = forwardRef<FirebaseRecaptchaRef, FirebaseRecaptchaProps>(
  ({ onEvent, isVisible, onClose }, ref) => {
    const webViewRef = useRef<WebView>(null);
    const [isWebViewReady, setIsWebViewReady] = useState(false);

    useImperativeHandle(ref, () => ({
      injectMessage: (data: any) => {
        webViewRef.current?.postMessage(JSON.stringify(data));
      },
    }));

    const handleMessage = (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'ready') {
          setIsWebViewReady(true);
        }
        onEvent(data);
      } catch (err) {
        console.error('[RECAPTCHA] Failed to parse WebView message:', err);
      }
    };

    const handleLoadEnd = () => {
      // Send init config to WebView
      webViewRef.current?.postMessage(
        JSON.stringify({
          type: 'init',
          config: firebaseConfig,
          recaptchaSize: 'invisible',
        })
      );
    };

    return (
      <Modal
        visible={isVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <View style={styles.modalContent}>
            {/* WebView container */}
            <View style={styles.webViewContainer}>
              <WebView
                ref={webViewRef}
                source={{
                  html: HTML_CONTENT,
                  baseUrl: 'https://nikhila-odisha-pandara-samaja.firebaseapp.com', // Match authorized domain
                }}
                onMessage={handleMessage}
                onLoadEnd={handleLoadEnd}
                style={styles.webView}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                originWhitelist={['*']}
                mixedContentMode="always"
              />
            </View>

            {/* Loading Indicator / Help text */}
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.text}>Security Check in Progress</Text>
              <Text style={styles.subtext}>
                Please wait a moment while we establish a secure connection.
              </Text>
              {onClose && (
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1e293b',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  webViewContainer: {
    width: '100%',
    height: 480,
    backgroundColor: '#0f172a',
  },
  webView: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  text: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
  },
  subtext: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#334155',
  },
  cancelText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
});
