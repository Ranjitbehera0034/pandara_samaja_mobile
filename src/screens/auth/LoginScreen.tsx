// src/screens/auth/LoginScreen.tsx
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { AuthStackParams } from '../../navigation/AuthStack';
import { APP_NAME, APP_TAGLINE } from '../../config/constants';

type Nav = StackNavigationProp<AuthStackParams, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { requestOtp } = useAuth();

  const [membershipNo, setMembershipNo] = useState('');
  const [mobile, setMobile] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useFirebase] = useState(true); // Firebase OTP by default

  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal>(null);

  const handleSendOtp = async () => {
    if (!membershipNo.trim()) {
      Alert.alert('Error', 'Please enter your Membership Number');
      return;
    }
    if (!mobile.trim() || mobile.replace(/\D/g, '').length < 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number');
      return;
    }

    setIsLoading(true);
    try {
      if (useFirebase) {
        // Firebase OTP path
        const formattedMobile = mobile.startsWith('+') ? mobile : `+91${mobile.replace(/\D/g, '')}`;
        const result = await signInWithPhoneNumber(auth, formattedMobile, recaptchaVerifier.current!);
        // Pass confirmationResult to OTP screen
        navigation.navigate('Otp', {
          membershipNo: membershipNo.trim(),
          mobile: mobile.replace(/\D/g, ''),
          confirmationResult: result,
          useFirebase: true,
        });
      } else {
        // Fast2SMS path
        await requestOtp(membershipNo.trim(), mobile);
        navigation.navigate('Otp', {
          membershipNo: membershipNo.trim(),
          mobile: mobile.replace(/\D/g, ''),
          useFirebase: false,
        });
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-900"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={auth.app.options}
        attemptInvisibleVerification={true}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View className="items-center mb-10">
          <View className="w-20 h-20 rounded-2xl bg-blue-600 items-center justify-center mb-4 shadow-2xl">
            <Text className="text-white font-bold text-4xl">P</Text>
          </View>
          <Text className="text-white font-bold text-2xl text-center">{APP_NAME}</Text>
          <Text className="text-slate-400 text-xs tracking-widest mt-1">{APP_TAGLINE}</Text>
        </View>

        {/* Card */}
        <View className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <Text className="text-white font-semibold text-lg mb-6">Member Login</Text>

          {/* Membership No */}
          <Text className="text-slate-400 text-sm mb-2">Membership Number</Text>
          <TextInput
            className="bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white mb-4 text-base"
            placeholder="e.g. MEM1234567"
            placeholderTextColor="#64748b"
            value={membershipNo}
            onChangeText={setMembershipNo}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          {/* Mobile */}
          <Text className="text-slate-400 text-sm mb-2">Mobile Number</Text>
          <View className="flex-row items-center bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 mb-6">
            <Text className="text-slate-400 mr-2">+91</Text>
            <TextInput
              className="flex-1 text-white text-base"
              placeholder="10-digit mobile number"
              placeholderTextColor="#64748b"
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          {/* Send OTP Button */}
          <TouchableOpacity
            className={`rounded-xl py-4 items-center ${isLoading ? 'bg-blue-800' : 'bg-blue-600'}`}
            onPress={handleSendOtp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">Send OTP</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text className="text-slate-500 text-xs text-center mt-6">
          By logging in, you agree to our Terms & Privacy Policy
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
