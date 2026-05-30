// src/screens/auth/OtpScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';

export default function OtpScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { verifyOtp, verifyFirebaseOtp } = useAuth();

  const { membershipNo, mobile, confirmationResult, useFirebase } = route.params as any;

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const inputs = useRef<Array<TextInput | null>>([null, null, null, null, null, null]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer === 0) return;
    const timer = setTimeout(() => setResendTimer(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handleOtpChange = (text: string, index: number) => {
    const cleanedText = text.replace(/\D/g, '');

    // Handle paste
    if (cleanedText.length === 6) {
      const digits = cleanedText.split('');
      setOtp(digits);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      inputs.current[5]?.focus();
      handleVerifyWithDigits(digits);
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleanedText.slice(-1); // only last char
    setOtp(newOtp);

    if (cleanedText && index < 5) {
      inputs.current[index + 1]?.focus();
    }

    if (newOtp.every(d => d !== '') && cleanedText) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      handleVerifyWithDigits(newOtp);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (!otp[index] && index > 0) {
        inputs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerifyWithDigits = async (digitsArray: string[]) => {
    const otpString = digitsArray.join('');
    if (otpString.length !== 6) return;

    setIsLoading(true);
    try {
      if (useFirebase && confirmationResult) {
        const credential = await confirmationResult.confirm(otpString);
        const idToken = await credential.user.getIdToken();
        await verifyFirebaseOtp(idToken, membershipNo, mobile);
      } else {
        await verifyOtp(membershipNo, mobile, otpString);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', err.message || 'Invalid OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = () => {
    handleVerifyWithDigits(otp);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-900"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-6">
        {/* Back */}
        <TouchableOpacity 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }} 
          className="mb-8"
          disabled={isLoading}
        >
          <Text className="text-blue-400 text-base">← Back</Text>
        </TouchableOpacity>

        <Text className="text-white font-bold text-2xl mb-2">Enter OTP</Text>
        <Text className="text-slate-400 text-sm mb-8">
          OTP sent to +91{mobile}
        </Text>

        {/* 6-digit OTP boxes */}
        <View className="flex-row gap-3 mb-8 justify-center">
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={(r) => { inputs.current[i] = r; }}
              className={`w-12 h-14 border rounded-xl text-center text-white text-xl font-bold bg-slate-800
                ${digit ? 'border-blue-500' : 'border-slate-600'}`}
              value={digit}
              onChangeText={(v) => handleOtpChange(v, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={6} // Allow paste lengths
              selectTextOnFocus
              editable={!isLoading}
            />
          ))}
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          className={`rounded-xl py-4 items-center mb-4 ${isLoading ? 'bg-blue-800' : 'bg-blue-600'}`}
          onPress={handleVerify}
          disabled={isLoading || otp.some(d => d === '')}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-base">Verify & Login</Text>
          )}
        </TouchableOpacity>

        {/* Resend */}
        <TouchableOpacity 
          disabled={resendTimer > 0 || isLoading} 
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            navigation.goBack();
          }}
        >
          <Text className={`text-center text-sm ${resendTimer > 0 ? 'text-slate-500' : 'text-blue-400'}`}>
            {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
