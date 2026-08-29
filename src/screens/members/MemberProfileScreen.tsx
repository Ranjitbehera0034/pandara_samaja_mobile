// src/screens/members/MemberProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity,
  ScrollView, ActivityIndicator, useWindowDimensions
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, MessageSquare, Users, Image as ImageIcon, LayoutGrid, BadgeCheck } from 'lucide-react-native';
import * as membersApi from '../../api/members';
import { cleanPhoto } from '../../utils/googleDriveUrl';
import PostCard from '../../components/feed/PostCard';
import MediaViewerModal from '../../components/feed/MediaViewerModal';
import EmptyState from '../../components/common/EmptyState';
import Avatar from '../../components/common/Avatar';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const isFemale = (g?: string | null) => ['female', 'f'].includes((g || '').toLowerCase());

export default function MemberProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { width: W } = useWindowDimensions();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const { id, name: nameParam } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'family' | 'gallery'>('posts');
  const [following, setFollowing] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

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
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl }}>
        <Text
          style={{
            color: C.textMuted,
            fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined,
            fontSize: typography.body.fontSize,
            lineHeight: typography.body.lineHeight,
            marginBottom: spacing.lg,
            textAlign: 'center',
          }}
        >
          {t('memberProfile', 'notFoundText')}
        </Text>
        <TouchableOpacity
          onPress={handleBack}
          style={{ backgroundColor: C.card, borderColor: C.border, borderRadius: radius.md, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.xl }}
          className="border"
        >
          <Text style={{ color: C.primaryLight, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, fontSize: typography.body.fontSize, fontWeight: '600' }}>
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
        <View style={{ backgroundColor: C.bg, paddingBottom: spacing.sm }}>
          {/* Back button */}
          <TouchableOpacity
            onPress={handleBack}
            className="flex-row items-center"
            style={{ gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md }}
          >
            <ArrowLeft size={16} color={C.textMuted} />
            <Text style={{ color: C.primaryLight, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, fontSize: typography.body.fontSize, fontWeight: '600' }}>
              {t('memberProfile', 'backLabel')}
            </Text>
          </TouchableOpacity>

          {/* ── Profile Header Card ── */}
          <View
            style={{ backgroundColor: C.card, borderColor: C.border, borderRadius: radius.lg, marginHorizontal: spacing.lg, ...shadow.raised }}
            className="border overflow-hidden"
          >
            {/* Cover banner - 128px tall gradient */}
            <LinearGradient
              colors={female ? [C.female, C.female + 'cc'] : [C.male, C.male + 'cc']}
              style={{ height: 128 }}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />

            <View style={{ paddingHorizontal: spacing.xl - 4, paddingBottom: spacing.xl - 4 }}>
              {/* Avatar + action buttons row */}
              <View className="flex-row justify-between items-end">
                {/* Large hero avatar */}
                <View style={{ marginTop: -48, zIndex: 10, ...shadow.card, borderRadius: radius.full }}>
                  <Avatar name={profile.name} photoUrl={photo} gender={profile.gender} size={96} />
                </View>

                {/* Follow + Message buttons */}
                <View className="flex-row" style={{ gap: spacing.sm, marginTop: spacing.sm }}>
                  <TouchableOpacity
                    onPress={handleFollow}
                    style={{ backgroundColor: following ? C.border : C.primary, borderRadius: radius.md, paddingHorizontal: spacing.xl - 4, paddingVertical: spacing.sm + 2 }}
                  >
                    <Text style={{ fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, color: '#fff', fontSize: typography.body.fontSize, fontWeight: '600' }}>
                      {following ? t('memberProfile', 'followingLabel') : t('memberProfile', 'followLabel')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleMessage}
                    style={{ backgroundColor: C.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2 }}
                    className="flex-row items-center"
                  >
                    <MessageSquare size={16} color="white" style={{ marginRight: spacing.xs + 2 }} />
                    <Text style={{ fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, color: '#fff', fontSize: typography.body.fontSize, fontWeight: '500' }}>
                      {t('memberProfile', 'messageLabel')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

            {/* Name + badges */}
            <View style={{ marginTop: spacing.md }}>
              <View className="flex-row items-center flex-wrap" style={{ gap: spacing.sm }}>
                <Text
                  style={{
                    color: C.text,
                    fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined,
                    fontSize: typography.display.fontSize,
                    lineHeight: typography.display.lineHeight,
                    fontWeight: typography.display.fontWeight,
                  }}
                >
                  {profile.name}
                </Text>
              </View>
              <View className="flex-row items-center flex-wrap" style={{ gap: spacing.sm, marginTop: spacing.xs }}>
                {profile.isHoF ? (
                  <View style={{ backgroundColor: C.amber + '1a', borderColor: C.amber + '33', borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 }} className="border">
                    <Text style={{ color: C.amber, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, fontSize: typography.caption.fontSize, fontWeight: '600' }}>
                      {t('memberProfile', 'headOfFamily')}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: C.textMuted, fontSize: typography.body.fontSize, lineHeight: typography.body.lineHeight }}>{profile.relation}</Text>
                )}
                <Text style={{ color: C.textFaint, fontSize: typography.body.fontSize, lineHeight: typography.body.lineHeight }}>#{profile.id}</Text>
              </View>

              {/* Location + joined */}
              <View style={{ marginTop: spacing.md, gap: spacing.sm - 2 }}>
                {profile.village ? (
                  <View className="flex-row items-center" style={{ gap: spacing.sm - 2 }}>
                    <MapPin size={16} color={C.textFaint} />
                    <Text style={{ color: C.textMuted, fontSize: typography.body.fontSize, lineHeight: typography.body.lineHeight }}>
                      {profile.village}{profile.district ? `, ${profile.district}` : ''}
                    </Text>
                  </View>
                ) : null}
                {profile.joined ? (
                  <View className="flex-row items-center" style={{ gap: spacing.sm - 2 }}>
                    <Users size={16} color={C.textFaint} />
                    <Text style={{ color: C.textMuted, fontSize: typography.body.fontSize, lineHeight: typography.body.lineHeight }}>{t('memberProfile', 'joinedPrefix')} {profile.joined}</Text>
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
                style={i < arr.length - 1 ? { borderRightWidth: 1, borderRightColor: C.border + '80', padding: spacing.md } : { padding: spacing.md }}
                className="flex-1 items-center"
              >
                <Text style={{ color: C.text, fontSize: typography.title.fontSize, lineHeight: typography.title.lineHeight, fontWeight: typography.title.fontWeight }}>{stat.value}</Text>
                <Text style={{ color: C.textFaint, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, fontSize: typography.caption.fontSize, fontWeight: '500' }} className="uppercase tracking-wider">{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

        {/* Child 1: Tab Navigation Bar (Sticky) */}
        <View style={{ backgroundColor: C.bg, paddingHorizontal: spacing.lg }}>
          <View style={{ borderColor: C.border }} className="flex-row border-b">
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => handleTabPress(tab.key as any)}
                style={{ borderBottomColor: activeTab === tab.key ? C.primaryLight : 'transparent', paddingHorizontal: spacing.md, paddingVertical: spacing.md - 2 }}
                className="flex-row items-center border-b-2"
              >
                {tab.icon}
                <Text style={{ color: activeTab === tab.key ? C.primaryLight : C.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, fontSize: typography.body.fontSize, fontWeight: '700', marginLeft: spacing.sm }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Child 2: Tab Content */}
        <View style={{ marginTop: spacing.lg, paddingHorizontal: spacing.lg }}>
          {/* Posts tab */}
          {activeTab === 'posts' && (
            <View style={{ gap: spacing.lg }}>
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
            <View style={{ backgroundColor: C.card, borderColor: C.border, borderRadius: radius.lg, ...shadow.card }} className="border overflow-hidden">
              <View style={{ backgroundColor: C.bg + '80', borderColor: C.border, padding: spacing.lg }} className="flex-row items-center justify-between border-b">
                <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, fontSize: typography.body.fontSize, fontWeight: '600' }}>
                  {t('memberProfile', 'familyMembersHeader')}
                </Text>
                <Text style={{ color: C.textFaint, fontSize: typography.caption.fontSize }}>#{profile.id}</Text>
              </View>
              {(profile.family || []).map((fam: any, idx: number) => {
                const fmPhoto = cleanPhoto(fam.avatar);
                return (
                  <View
                    key={idx}
                    style={{ borderColor: C.border + '80', gap: spacing.lg, padding: spacing.lg }}
                    className="flex-row items-center border-b"
                  >
                    <Avatar name={fam.name} photoUrl={fmPhoto} gender={fam.gender} size={40} />
                    <View className="flex-1">
                      <View className="flex-row items-center" style={{ gap: spacing.sm - 2 }}>
                        <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, fontSize: typography.body.fontSize, fontWeight: '600' }}>{fam.name}</Text>
                        {fam.isHoF && <BadgeCheck size={16} color={C.amber} />}
                      </View>
                      <Text style={{ color: C.textMuted, fontSize: typography.body.fontSize, lineHeight: typography.body.lineHeight }} className="capitalize">{fam.relation}</Text>
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
                <View className="flex-row flex-wrap" style={{ gap: spacing.sm }}>
                  {galleryItems.map((item: any, idx: number) => (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.9}
                      onPress={() => { setViewerIndex(idx); setViewerVisible(true); }}
                      style={{ width: (W - 48) / 3, height: (W - 48) / 3, backgroundColor: C.card, borderColor: C.border, borderRadius: radius.md }}
                      className="overflow-hidden border"
                    >
                      <Image source={{ uri: item.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
                    </TouchableOpacity>
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

      <MediaViewerModal
        visible={viewerVisible}
        media={galleryItems}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
      />
    </View>
  );
}
