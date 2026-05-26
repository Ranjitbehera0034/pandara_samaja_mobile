// src/screens/members/MemberProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Image,
  ScrollView, ActivityIndicator, Dimensions, SafeAreaView
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, MapPin, MessageSquare, Users, Image as ImageIcon, LayoutGrid, BadgeCheck } from 'lucide-react-native';
import * as membersApi from '../../api/members';
import { cleanPhoto, getInitial } from '../../utils/googleDriveUrl';
import PostCard from '../../components/feed/PostCard';

const { width: W } = Dimensions.get('window');
const isFemale = (g?: string | null) => ['female', 'f'].includes((g || '').toLowerCase());

export default function MemberProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id, name: nameParam } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'family' | 'gallery'>('posts');
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    membersApi.fetchPublicProfile(id, nameParam)
      .then(data => {
        if (data.success) {
          setProfile(data.profile);
          setFollowing(data.profile.isFollowing);
        }
      })
      .catch(err => console.error('[MEMBER PROFILE]', err))
      .finally(() => setLoading(false));
  }, [id, nameParam]);

  const handleFollow = async () => {
    if (!profile) return;
    // Optimistic update
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    setProfile((p: any) => p ? ({
      ...p,
      stats: {
        ...p.stats,
        followers: p.stats.followers + (wasFollowing ? -1 : 1)
      }
    }) : p);
    try {
      await membersApi.toggleSubscribe(profile.id);
    } catch {
      setFollowing(wasFollowing); // revert
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900 justify-center items-center px-6">
        <Text className="text-slate-400 text-center mb-4">Profile not found or restricted.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="py-2.5 px-6 bg-slate-800 rounded-xl border border-slate-700">
          <Text className="text-blue-400 font-semibold">← Return to Members</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const female = isFemale(profile.gender);
  const photo = cleanPhoto(profile.avatar);
  const galleryItems = (profile.posts || []).flatMap((p: any) => p.media || []).filter((m: any) => m.type === 'image');

  const TABS = [
    { key: 'posts', label: 'Posts', icon: <LayoutGrid size={16} color={activeTab === 'posts' ? '#3b82f6' : '#94a3b8'} /> },
    { key: 'family', label: `Family (${profile.stats?.familyMembers || 0})`, icon: <Users size={16} color={activeTab === 'family' ? '#3b82f6' : '#94a3b8'} /> },
    { key: 'gallery', label: 'Gallery', icon: <ImageIcon size={16} color={activeTab === 'gallery' ? '#3b82f6' : '#94a3b8'} /> },
  ];

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>

        {/* Back button */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="flex-row items-center gap-2 px-4 pt-4 pb-2"
        >
          <ArrowLeft size={16} color="#94a3b8" />
          <Text className="text-slate-400 text-sm">Back</Text>
        </TouchableOpacity>

        {/* ── Profile Header Card ── */}
        <View className="mx-4 bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">

          {/* Cover banner */}
          <View
            className={`h-32 ${female
              ? 'bg-pink-600'
              : 'bg-blue-600'
            }`}
          />

          <View className="px-5 pb-5">
            {/* Avatar + action buttons row */}
            <View className="flex-row justify-between items-end">
              {/* Large avatar */}
              <View className={`w-24 h-24 rounded-full border-4 border-slate-800 -mt-12 overflow-hidden items-center justify-center z-10 bg-slate-850`}>
                {photo ? (
                  <Image source={{ uri: photo }} className="w-full h-full" resizeMode="cover" />
                ) : (
                  <View className={`w-full h-full items-center justify-center ${female ? 'bg-pink-600' : 'bg-blue-600'}`}>
                    <Text className="text-white font-bold text-4xl">{getInitial(profile.name)}</Text>
                  </View>
                )}
              </View>

              {/* Follow + Message buttons */}
              <View className="flex-row gap-2 mt-2">
                <TouchableOpacity
                  onPress={handleFollow}
                  className={`px-5 py-2 rounded-xl font-medium ${following ? 'bg-slate-700' : 'bg-blue-600'}`}
                >
                  <Text className="text-white text-sm font-semibold">{following ? 'Following' : 'Follow'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Chat', { withId: profile.id, withName: profile.name })}
                  className="flex-row items-center gap-1.5 px-4 py-2 bg-slate-700 rounded-xl"
                >
                  <MessageSquare size={14} color="white" />
                  <Text className="text-white text-sm font-medium">Message</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Name + badges */}
            <View className="mt-3">
              <View className="flex-row items-center gap-2 flex-wrap">
                <Text className="text-white text-2xl font-bold">{profile.name}</Text>
              </View>
              <View className="flex-row items-center gap-2 mt-1 flex-wrap">
                {profile.isHoF ? (
                  <View className="bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                    <Text className="text-blue-400 text-xs font-semibold">Head of Family</Text>
                  </View>
                ) : (
                  <Text className="text-slate-400 text-sm">{profile.relation}</Text>
                )}
                <Text className="text-slate-500 text-sm">#{profile.id}</Text>
              </View>

              {/* Location + joined */}
              <View className="mt-3 gap-1.5">
                {profile.village ? (
                  <View className="flex-row items-center gap-1.5">
                    <MapPin size={14} color="#64748b" />
                    <Text className="text-slate-300 text-sm">
                      {profile.village}{profile.district ? `, ${profile.district}` : ''}
                    </Text>
                  </View>
                ) : null}
                {profile.joined ? (
                  <View className="flex-row items-center gap-1.5">
                    <Users size={14} color="#64748b" />
                    <Text className="text-slate-300 text-sm">Joined {profile.joined}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* ── Stats bar ── */}
          <View className="flex-row border-t border-slate-700/50 bg-slate-900/30">
            {[
              { label: 'Posts', value: profile.stats?.posts ?? 0 },
              { label: 'Followers', value: profile.stats?.followers ?? 0 },
              { label: 'Following', value: profile.stats?.following ?? 0 },
              { label: 'Family', value: profile.stats?.familyMembers ?? 0 },
            ].map((stat, i, arr) => (
              <View
                key={stat.label}
                className={`flex-1 p-3 items-center ${i < arr.length - 1 ? 'border-r border-slate-700/50' : ''}`}
              >
                <Text className="text-white text-lg font-bold">{stat.value}</Text>
                <Text className="text-slate-500 text-xs font-medium uppercase tracking-wider">{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Tab navigation ── */}
        <View className="flex-row border-b border-slate-700 mx-4 mt-4">
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key as any)}
              className={`flex-row items-center gap-2 px-3 py-3 border-b-2 ${activeTab === tab.key
                ? 'border-blue-500'
                : 'border-transparent'
              }`}
            >
              {tab.icon}
              <Text className={`text-sm font-medium ${activeTab === tab.key ? 'text-blue-400' : 'text-slate-400'}`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Tab content ── */}
        <View className="mt-4 px-4">

          {/* Posts tab */}
          {activeTab === 'posts' && (
            <View className="gap-4">
              {(profile.posts || []).length > 0 ? (
                profile.posts.map((post: any) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onLike={() => {}}
                    onComment={() => {}}
                    onLikeComment={() => {}}
                  />
                ))
              ) : (
                <View className="bg-slate-800/50 rounded-2xl p-8 items-center border border-slate-700/50">
                  <Text className="text-slate-400">No posts yet from {profile.name}.</Text>
                </View>
              )}
            </View>
          )}

          {/* Family tab */}
          {activeTab === 'family' && (
            <View className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
              <View className="flex-row items-center justify-between p-4 bg-slate-900/50 border-b border-slate-700">
                <Text className="text-white font-semibold">Family Members</Text>
                <Text className="text-slate-500 text-xs">#{profile.id}</Text>
              </View>
              {(profile.family || []).map((fam: any, idx: number) => {
                const fmFemale = isFemale(fam.gender);
                const fmPhoto = cleanPhoto(fam.avatar);
                return (
                  <View
                    key={idx}
                    className="flex-row items-center gap-4 p-4 border-b border-slate-700/50"
                  >
                    <View className={`w-12 h-12 rounded-full overflow-hidden items-center justify-center ${fmFemale ? 'bg-pink-600' : 'bg-blue-600'}`}>
                      {fmPhoto ? (
                        <Image source={{ uri: fmPhoto }} className="w-full h-full" resizeMode="cover" />
                      ) : (
                        <Text className="text-white font-bold text-lg">{getInitial(fam.name)}</Text>
                      )}
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-white font-semibold">{fam.name}</Text>
                        {fam.isHoF && <BadgeCheck size={14} color="#3b82f6" />}
                      </View>
                      <Text className="text-slate-400 text-sm capitalize">{fam.relation}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Gallery tab */}
          {activeTab === 'gallery' && (
            <View>
              {galleryItems.length > 0 ? (
                <View className="flex-row flex-wrap gap-1">
                  {galleryItems.map((item: any, idx: number) => (
                    <View
                      key={idx}
                      style={{ width: (W - 40) / 3, height: (W - 40) / 3 }}
                      className="rounded-xl overflow-hidden bg-slate-800 border border-slate-700"
                    >
                      <Image source={{ uri: item.url }} className="w-full h-full" resizeMode="cover" />
                    </View>
                  ))}
                </View>
              ) : (
                <View className="bg-slate-800/50 rounded-2xl p-8 items-center border border-slate-700/50">
                  <Text className="text-slate-400">No photos in {profile.name}'s gallery.</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
