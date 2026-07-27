// src/screens/members/MemberProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity,
  ScrollView, ActivityIndicator, Dimensions
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, MessageSquare, Users, Image as ImageIcon, LayoutGrid, BadgeCheck } from 'lucide-react-native';
import * as membersApi from '../../api/members';
import { cleanPhoto, getInitial } from '../../utils/googleDriveUrl';
import PostCard from '../../components/feed/PostCard';
import EmptyState from '../../components/common/EmptyState';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const { width: W } = Dimensions.get('window');
const isFemale = (g?: string | null) => ['female', 'f'].includes((g || '').toLowerCase());

export default function MemberProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors: C } = useTheme();
  const { lang, t } = useLanguage();
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setFollowing(wasFollowing); // revert
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const handleMessage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Chat', { withId: profile.id, withName: profile.name });
  };

  const handleTabPress = (tabKey: 'posts' | 'family' | 'gallery') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tabKey);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={C.primaryLight} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        <Text style={{ color: C.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-center mb-4">
          {t('memberProfile', 'notFoundText')}
        </Text>
        <TouchableOpacity onPress={handleBack} style={{ backgroundColor: C.card, borderColor: C.border }} className="py-2.5 px-6 rounded-xl border">
          <Text style={{ color: C.primaryLight, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="font-semibold">
            {t('memberProfile', 'returnToMembers')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const female = isFemale(profile.gender);
  const photo = cleanPhoto(profile.avatar);
  const galleryItems = (profile.posts || []).flatMap((p: any) => p.media || []).filter((m: any) => m.type === 'image');

  const TABS = [
    { key: 'posts', label: t('memberProfile', 'postsTabLabel'), icon: <LayoutGrid size={16} color={activeTab === 'posts' ? C.primaryLight : C.textMuted} /> },
    { key: 'family', label: `${t('memberProfile', 'familyTabLabel')} (${profile.stats?.familyMembers || 0})`, icon: <Users size={16} color={activeTab === 'family' ? C.primaryLight : C.textMuted} /> },
    { key: 'gallery', label: t('memberProfile', 'galleryTabLabel'), icon: <ImageIcon size={16} color={activeTab === 'gallery' ? C.primaryLight : C.textMuted} /> },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        stickyHeaderIndices={[1]}
      >
        {/* Child 0: Profile Header Card */}
        <View style={{ backgroundColor: C.bg, paddingBottom: 8 }}>
          {/* Back button */}
          <TouchableOpacity
            onPress={handleBack}
            className="flex-row items-center gap-2 px-4 pt-3 pb-3"
          >
            <ArrowLeft size={16} color={C.textMuted} />
            <Text style={{ color: C.primaryLight, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-sm font-semibold">
              {t('memberProfile', 'backLabel')}
            </Text>
          </TouchableOpacity>

          {/* ── Profile Header Card ── */}
          <View style={{ backgroundColor: C.card, borderColor: C.border }} className="mx-4 border rounded-2xl overflow-hidden shadow-xl">
            {/* Cover banner - 128px tall gradient */}
            <LinearGradient
              colors={female ? [C.female, C.female + 'cc'] : [C.male, C.male + 'cc']}
              style={{ height: 128 }}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />

            <View className="px-5 pb-5">
              {/* Avatar + action buttons row */}
              <View className="flex-row justify-between items-end">
                {/* Large avatar - rounded-2xl shape */}
                <View style={{ borderColor: C.card, backgroundColor: C.card }} className="w-24 h-24 rounded-2xl border-4 -mt-12 overflow-hidden items-center justify-center z-10 shadow-md">
                  {photo ? (
                    <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
                  ) : (
                    <View className="w-full h-full items-center justify-center" style={{ backgroundColor: female ? C.female : C.male }}>
                      <Text className="text-white font-bold text-4xl">{getInitial(profile.name)}</Text>
                    </View>
                  )}
                </View>

                {/* Follow + Message buttons */}
                <View className="flex-row gap-2 mt-2">
                  <TouchableOpacity
                    onPress={handleFollow}
                    className="px-5 py-2 rounded-xl font-medium"
                    style={{ backgroundColor: following ? C.border : C.primary }}
                  >
                    <Text style={{ fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-white text-sm font-semibold">
                      {following ? t('memberProfile', 'followingLabel') : t('memberProfile', 'followLabel')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleMessage}
                    style={{ backgroundColor: C.border }}
                    className="flex-row items-center gap-1.5 px-4 py-2 rounded-xl"
                  >
                    <MessageSquare size={14} color="white" />
                    <Text style={{ fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-white text-sm font-medium">
                      {t('memberProfile', 'messageLabel')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

            {/* Name + badges */}
            <View className="mt-3">
              <View className="flex-row items-center gap-2 flex-wrap">
                <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }} className="text-2xl font-bold">{profile.name}</Text>
              </View>
              <View className="flex-row items-center gap-2 mt-1 flex-wrap">
                {profile.isHoF ? (
                  <View style={{ backgroundColor: C.amber + '1a', borderColor: C.amber + '33' }} className="border px-2 py-0.5 rounded-full">
                    <Text style={{ color: C.amber, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-xs font-semibold">
                      {t('memberProfile', 'headOfFamily')}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: C.textMuted }} className="text-sm">{profile.relation}</Text>
                )}
                <Text style={{ color: C.textFaint }} className="text-sm">#{profile.id}</Text>
              </View>

              {/* Location + joined */}
              <View className="mt-3 gap-1.5">
                {profile.village ? (
                  <View className="flex-row items-center gap-1.5">
                    <MapPin size={14} color={C.textFaint} />
                    <Text style={{ color: C.textMuted }} className="text-sm">
                      {profile.village}{profile.district ? `, ${profile.district}` : ''}
                    </Text>
                  </View>
                ) : null}
                {profile.joined ? (
                  <View className="flex-row items-center gap-1.5">
                    <Users size={14} color={C.textFaint} />
                    <Text style={{ color: C.textMuted }} className="text-sm">{t('memberProfile', 'joinedPrefix')} {profile.joined}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* ── Stats bar ── */}
          <View style={{ borderColor: C.border + '80', backgroundColor: C.bg + '4d' }} className="flex-row border-t">
            {[
              { label: t('memberProfile', 'postsTabLabel'), value: profile.stats?.posts ?? 0 },
              { label: t('memberProfile', 'statsFollowersLabel'), value: profile.stats?.followers ?? 0 },
              { label: t('memberProfile', 'followingLabel'), value: profile.stats?.following ?? 0 },
              { label: t('memberProfile', 'familyTabLabel'), value: profile.stats?.familyMembers ?? 0 },
            ].map((stat, i, arr) => (
              <View
                key={stat.label}
                style={i < arr.length - 1 ? { borderRightWidth: 1, borderRightColor: C.border + '80' } : undefined}
                className="flex-1 p-3 items-center"
              >
                <Text style={{ color: C.text }} className="text-lg font-bold">{stat.value}</Text>
                <Text style={{ color: C.textFaint, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-xs font-medium uppercase tracking-wider">{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

        {/* Child 1: Tab Navigation Bar (Sticky) */}
        <View style={{ backgroundColor: C.bg, paddingHorizontal: 16 }}>
          <View style={{ borderColor: C.border }} className="flex-row border-b">
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => handleTabPress(tab.key as any)}
                style={{ borderBottomColor: activeTab === tab.key ? C.primaryLight : 'transparent' }}
                className="flex-row items-center gap-2 px-3 py-3.5 border-b-2"
              >
                {tab.icon}
                <Text style={{ color: activeTab === tab.key ? C.primaryLight : C.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-sm font-bold">
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Child 2: Tab Content */}
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
                <EmptyState
                  emoji="📝"
                  title={t('memberProfile', 'noPostsTitle')}
                  subtitle={t('memberProfile', 'noPostsSubtitle')}
                />
              )}
            </View>
          )}

          {/* Family tab */}
          {activeTab === 'family' && (
            <View style={{ backgroundColor: C.card, borderColor: C.border }} className="border rounded-2xl overflow-hidden shadow-md">
              <View style={{ backgroundColor: C.bg + '80', borderColor: C.border }} className="flex-row items-center justify-between p-4 border-b">
                <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="font-semibold">
                  {t('memberProfile', 'familyMembersHeader')}
                </Text>
                <Text style={{ color: C.textFaint }} className="text-xs">#{profile.id}</Text>
              </View>
              {(profile.family || []).map((fam: any, idx: number) => {
                const fmFemale = isFemale(fam.gender);
                const fmPhoto = cleanPhoto(fam.avatar);
                return (
                  <View
                    key={idx}
                    style={{ borderColor: C.border + '80' }}
                    className="flex-row items-center gap-4 p-4 border-b"
                  >
                    <View className="w-12 h-12 rounded-full overflow-hidden items-center justify-center" style={{ backgroundColor: fmFemale ? C.female : C.male }}>
                      {fmPhoto ? (
                        <Image source={{ uri: fmPhoto }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
                      ) : (
                        <Text className="text-white font-bold text-lg">{getInitial(fam.name)}</Text>
                      )}
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5">
                        <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="font-semibold">{fam.name}</Text>
                        {fam.isHoF && <BadgeCheck size={14} color={C.amber} />}
                      </View>
                      <Text style={{ color: C.textMuted }} className="text-sm capitalize">{fam.relation}</Text>
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
                <View className="flex-row flex-wrap gap-2">
                  {galleryItems.map((item: any, idx: number) => (
                    <View
                      key={idx}
                      style={{ width: (W - 48) / 3, height: (W - 48) / 3, backgroundColor: C.card, borderColor: C.border }}
                      className="rounded-xl overflow-hidden border"
                    >
                      <Image source={{ uri: item.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
                    </View>
                  ))}
                </View>
              ) : (
                <EmptyState
                  emoji="🖼️"
                  title={t('memberProfile', 'noPhotosTitle')}
                  subtitle={t('memberProfile', 'noPhotosSubtitle')}
                />
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
