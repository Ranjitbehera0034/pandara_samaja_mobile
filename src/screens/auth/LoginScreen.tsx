// src/screens/auth/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, Image, Linking
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { AuthStackParams } from '../../navigation/AuthStack';
import { APP_NAME, APP_TAGLINE } from '../../config/constants';

type Nav = StackNavigationProp<AuthStackParams, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { requestOtp } = useAuth();
  const insets = useSafeAreaInsets();

  const [membershipNo, setMembershipNo] = useState('');
  const [mobile, setMobile] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isValid = membershipNo.trim().length > 0 && mobile.replace(/\D/g, '').length === 10;

  const handleMobileChange = (text: string) => {
    const clean = text.replace(/\D/g, '');
    setMobile(clean);
    if (clean.length === 10) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (clean.length > 0) {
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
      // Calls credential lookup + WebView Firebase verification or dev bypass
      const result = await requestOtp(membershipNo.trim(), mobile);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate('Otp', {
        membershipNo: membershipNo.trim(),
        mobile: mobile.replace(/\D/g, ''),
        useFirebase: result.useFirebase,
      });
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetMembershipNo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = 'https://wa.me/918249339238?text=Hello%20Pandara%20Samaja%20Support%2C%20I%20do%20not%20have%20my%20Membership%20Number.%20Please%20help%20me%20find%20it.%20My%20name%20is%3A%20';
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'WhatsApp is not installed on your device');
    });
  };

  const handleUpdateMobile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = 'https://wa.me/918249339238?text=Hello%20Pandara%20Samaja%20Support%2C%20I%20need%20to%20update%20my%2520registered%2520mobile%2520number.%20My%20Membership%20No%20is%3A%20' + encodeURIComponent(membershipNo);
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'WhatsApp is not installed on your device');
    });
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-900"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24
        }}
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
        <View className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
          <Text className="text-white font-semibold text-lg mb-6">Member Login</Text>

          {/* Membership No */}
          <Text className="text-slate-400 text-sm mb-2">Membership Number</Text>
          <TextInput
            className="bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white mb-4 text-base"
            placeholder="e.g. MEM1234567"
            placeholderTextColor="#64748b"
            value={membershipNo}
            onChangeText={(text) => {
              setMembershipNo(text);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!isLoading}
          />

          {/* Mobile */}
          <Text className="text-slate-400 text-sm mb-2">Mobile Number</Text>
          <View className="flex-row items-center bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 mb-6">
            <Text className="text-slate-400 mr-2 font-medium">+91</Text>
            <TextInput
              className="flex-1 text-white text-base"
              placeholder="10-digit mobile number"
              placeholderTextColor="#64748b"
              value={mobile}
              onChangeText={handleMobileChange}
              keyboardType="phone-pad"
              maxLength={10}
              editable={!isLoading}
            />
          </View>

          {/* Send OTP Button */}
          <TouchableOpacity
            className={`rounded-xl py-4 items-center transition-all ${
              !isValid || isLoading ? 'bg-slate-700 opacity-60' : 'bg-blue-600 shadow-lg shadow-blue-500/20'
            }`}
            onPress={handleSendOtp}
            disabled={!isValid || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">Send OTP</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* WhatsApp Help & Support Card */}
        <View className="mt-6 bg-slate-800/40 border border-slate-700/40 rounded-2xl p-5">
          <Text className="text-white font-bold text-sm mb-3">Help & Support</Text>
          
          {/* Find Membership No */}
          <TouchableOpacity
            onPress={handleGetMembershipNo}
            className="flex-row items-center justify-between py-3 border-b border-slate-800"
          >
            <Text className="text-slate-300 text-xs font-semibold">
              Don't have a Membership No.?
            </Text>
            <Text className="text-blue-400 text-xs font-bold">
              Get it on WhatsApp →
            </Text>
          </TouchableOpacity>

          {/* Update Mobile Number */}
          <TouchableOpacity
            onPress={handleUpdateMobile}
            className="flex-row items-center justify-between py-3"
          >
            <Text className="text-slate-300 text-xs font-semibold">
              Need to register/update Mobile No.?
            </Text>
            <Text className="text-blue-400 text-xs font-bold">
              Update on WhatsApp →
            </Text>
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
