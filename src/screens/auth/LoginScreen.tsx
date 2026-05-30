// src/screens/auth/LoginScreen.tsx
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { signInWithPhoneNumber } from 'firebase/auth';
import * as Haptics from 'expo-haptics';
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

  const isValid = membershipNo.trim().length > 0 && mobile.replace(/\D/g, '').length === 10;

  const handleMobileChange = (text: string) => {
    const clean = text.replace(/\D/g, '');
    setMobile(clean);
    if (clean.length === 10) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSendOtp = async () => {
    if (!membershipNo.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Please enter your Membership Number');
      return;
    }
    if (!mobile.trim() || mobile.replace(/\D/g, '').length < 10) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number');
      return;
    }

    setIsLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (useFirebase) {
        // Firebase OTP path
        const formattedMobile = mobile.startsWith('+') ? mobile : `+91${mobile.replace(/\D/g, '')}`;
        const result = await signInWithPhoneNumber(auth, formattedMobile, recaptchaVerifier.current!);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.navigate('Otp', {
          membershipNo: membershipNo.trim(),
          mobile: mobile.replace(/\D/g, ''),
          useFirebase: false,
        });
      }
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
          <View className="w-24 h-24 rounded-3xl bg-slate-800 items-center justify-center mb-4 border border-slate-700 shadow-2xl overflow-hidden">
            <Image
              source={require('../../../assets/logo.png')}
              style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
            />
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
            onChangeText={(text) => {
              setMembershipNo(text);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
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
              onChangeText={handleMobileChange}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          {/* Send OTP Button */}
          <TouchableOpacity
            className={`rounded-xl py-4 items-center ${!isValid || isLoading ? 'bg-slate-700 opacity-60' : 'bg-blue-600'}`}
            onPress={handleSendOtp}
            disabled={!isValid || isLoading}
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
