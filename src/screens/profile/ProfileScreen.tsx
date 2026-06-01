// src/screens/profile/ProfileScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Edit2, Check, X, Camera, ChevronDown, ChevronUp, Users, Heart, Image as ImageIcon, Calendar, ShieldAlert } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { cleanPhoto, getInitial } from '../../utils/googleDriveUrl';

const { width: W } = Dimensions.get('window');

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { member, user } = useAuth();

  // Inline editing states
  const [isEditing, setIsEditing] = useState(false);
  const [address, setAddress] = useState(member?.address || '');
  const [village, setVillage] = useState(member?.village || '');
  const [panchayat, setPanchayat] = useState(member?.panchayat || '');
  const [familyCollapsed, setFamilyCollapsed] = useState(false);

  const handleEditToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isEditing) {
      // Revert changes
      setAddress(member?.address || '');
      setVillage(member?.village || '');
      setPanchayat(member?.panchayat || '');
    }
    setIsEditing(!isEditing);
  };

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsEditing(false);
    // Locally simulate save
    Alert.alert('Profile Saved', 'Your address details have been updated.');
  };

  const handleAvatarPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Profile Photo',
      'Change or remove your profile picture.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove Photo', 
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            Alert.alert('Removed', 'Profile photo removed.');
          }
        },
        { 
          text: 'Upload New Photo', 
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Upload', 'Photo upload simulated.');
          } 
        },
      ]
    );
  };

  const familyMembers = member?.family_members || [];

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a', paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 py-3 border-b border-slate-800 flex-row items-center bg-slate-900 justify-between">
        <Text className="text-white font-bold text-xl tracking-wide">My Profile</Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('Settings');
          }}
          className="py-1 px-3 bg-slate-800 rounded-full border border-slate-700/50"
        >
          <Text className="text-slate-300 text-xs font-semibold">Settings</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      >
        {/* Profile Card Header */}
        <View className="m-4 bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-xl items-center relative">
          
          {/* Cover gradient proxy */}
          <View className="w-full h-24 bg-blue-600/20 border border-blue-500/10 rounded-xl mb-6 items-center justify-center">
            <Text className="text-blue-400/60 font-bold text-xs tracking-wider uppercase">Pandara Member</Text>
          </View>

          {/* Avatar Upload */}
          <TouchableOpacity 
            onPress={handleAvatarPress}
            className="w-24 h-24 rounded-2xl border-4 border-slate-800 -mt-16 overflow-hidden items-center justify-center bg-slate-900 shadow-md relative"
          >
            {user?.profile_photo_url ? (
              <Image source={{ uri: cleanPhoto(user.profile_photo_url) || '' }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
            ) : (
              <View className="w-full h-full items-center justify-center bg-blue-600">
                <Text className="text-white font-bold text-4xl">{getInitial(user?.name || member?.name)}</Text>
              </View>
            )}
            <View className="absolute inset-0 bg-black/40 items-center justify-center opacity-80">
              <Camera size={18} color="white" />
            </View>
          </TouchableOpacity>

          <Text className="text-white font-bold text-xl mt-3">{user?.name || member?.name}</Text>
          
          <View className="flex-row items-center gap-2 mt-1">
            {user?.relation === 'Head' || !user?.relation ? (
              <View className="bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                <Text className="text-amber-500 text-xs font-bold">Head of Family</Text>
              </View>
            ) : (
              <View className="bg-slate-700 px-2 py-0.5 rounded-full">
                <Text className="text-slate-300 text-xs font-medium capitalize">{user?.relation}</Text>
              </View>
            )}
            <Text className="text-slate-500 text-sm font-semibold">#{member?.membership_no}</Text>
          </View>

          <Text className="text-slate-400 text-xs mt-1">Mobile: +91{user?.mobile || member?.mobile}</Text>
        </View>

        {/* 2x2 Family Hub Quick Links Grid */}
        <View className="mx-4 mb-4">
          <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2.5 ml-1">Family Hub</Text>
          <View className="flex-row flex-wrap gap-2">
            {[
              { label: 'Family Tree', icon: <Users size={20} color="#3b82f6" />, screen: 'FamilyTree', desc: 'Genealogy tree' },
              { label: 'Matrimony', icon: <Heart size={20} color="#ec4899" />, screen: 'Matrimony', desc: 'Find matches' },
              { label: 'Family Albums', icon: <ImageIcon size={20} color="#a855f7" />, screen: 'FamilyAlbums', desc: 'Shared gallery' },
              { label: 'Family Events', icon: <Calendar size={20} color="#10b981" />, screen: 'FamilyEvents', desc: 'Rsvped events' },
            ].map(hub => (
              <TouchableOpacity
                key={hub.label}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate(hub.screen);
                }}
                style={{ width: (W - 40) / 2 }}
                className="bg-slate-800 border border-slate-700/60 p-4 rounded-2xl shadow-sm flex-col justify-between active:bg-slate-750"
              >
                <View className="w-9 h-9 rounded-xl bg-slate-900/60 items-center justify-center mb-3">
                  {hub.icon}
                </View>
                <View>
                  <Text className="text-white font-bold text-sm">{hub.label}</Text>
                  <Text className="text-slate-500 text-[10px] mt-0.5">{hub.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Inline Address Details Edit */}
        <View className="mx-4 bg-slate-800 border border-slate-700 rounded-2xl p-5 mb-4 shadow-md">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white font-bold text-base">Address Information</Text>
            {isEditing ? (
              <View className="flex-row gap-2">
                <TouchableOpacity onPress={handleEditToggle} className="p-1">
                  <X size={18} color="#ef4444" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} className="p-1">
                  <Check size={18} color="#22c55e" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={handleEditToggle} className="p-1">
                <Edit2 size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Village */}
          <Text className="text-slate-400 text-xs mb-1">Village</Text>
          {isEditing ? (
            <TextInput
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm mb-3"
              value={village}
              onChangeText={setVillage}
              placeholder="Village name"
              placeholderTextColor="#64748b"
            />
          ) : (
            <Text className="text-white text-sm mb-3 font-semibold">{member?.village || 'Not specified'}</Text>
          )}

          {/* Panchayat */}
          <Text className="text-slate-400 text-xs mb-1">Panchayat</Text>
          {isEditing ? (
            <TextInput
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm mb-3"
              value={panchayat}
              onChangeText={setPanchayat}
              placeholder="Panchayat name"
              placeholderTextColor="#64748b"
            />
          ) : (
            <Text className="text-white text-sm mb-3 font-semibold">{member?.panchayat || 'Not specified'}</Text>
          )}

          {/* Full Address */}
          <Text className="text-slate-400 text-xs mb-1">Full Address</Text>
          {isEditing ? (
            <TextInput
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm min-h-16"
              value={address}
              onChangeText={setAddress}
              placeholder="Full address details"
              placeholderTextColor="#64748b"
              multiline
            />
          ) : (
            <Text className="text-white text-sm leading-5 font-semibold">{member?.address || 'Not specified'}</Text>
          )}
        </View>

        {/* Collapsible Family Members List Section */}
        <View className="mx-4 bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-md">
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFamilyCollapsed(!familyCollapsed);
            }}
            className="flex-row items-center justify-between p-4 bg-slate-900/40 border-b border-slate-700"
          >
            <View className="flex-row items-center gap-2">
              <Users size={16} color="#3b82f6" />
              <Text className="text-white font-bold text-sm">Family Members ({familyMembers.length})</Text>
            </View>
            {familyCollapsed ? <ChevronDown size={16} color="#94a3b8" /> : <ChevronUp size={16} color="#94a3b8" />}
          </TouchableOpacity>

          {!familyCollapsed && (
            <View className="p-1">
              {familyMembers.length === 0 ? (
                <Text className="text-slate-500 text-xs text-center py-6">No family members registered.</Text>
              ) : (
                familyMembers.map((fam, idx) => (
                  <View
                    key={idx}
                    className="flex-row items-center gap-3 p-3 border-b border-slate-700/30 last:border-0"
                  >
                    <View className="w-10 h-10 rounded-full bg-blue-600/10 border border-blue-500/20 items-center justify-center">
                      <Text className="text-blue-400 font-bold text-base">{getInitial(fam.name)}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-semibold text-sm">{fam.name}</Text>
                      <Text className="text-slate-400 text-xs capitalize mt-0.5">{fam.relation} · {fam.age} yrs</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
