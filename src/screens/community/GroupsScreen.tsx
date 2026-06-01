// src/screens/community/GroupsScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { Search, ArrowLeft, Users, Check, Plus, ShieldCheck, X } from 'lucide-react-native';
import { C } from '../../theme/colors';
import { useLanguage } from '../../context/LanguageContext';
import SkeletonBox from '../../components/common/SkeletonBox';
import EmptyState from '../../components/common/EmptyState';
import { Image } from 'expo-image';

interface Group {
  id: string;
  name: string;
  nameOdia: string;
  description: string;
  descriptionOdia: string;
  category: 'regional' | 'matrimony' | 'youth' | 'social' | 'professional';
  categoryLabel: string;
  categoryLabelOdia: string;
  memberCount: number;
  coverUrl: string;
  isJoined: boolean;
}

const MOCK_GROUPS: Group[] = [
  {
    id: 'g1',
    name: 'Bhubaneswar Pandara Unit',
    nameOdia: 'ଭୁବନେଶ୍ୱର ପଣ୍ଡାର ୟୁନିଟ୍',
    description: 'Official group for members residing in Bhubaneswar. Regular weekend assemblies and local events.',
    descriptionOdia: 'ଭୁବନେଶ୍ୱରରେ ରହୁଥିବା ସଦସ୍ୟମାନଙ୍କ ପାଇଁ ସରକାରୀ ଗ୍ରୁପ୍। ନିୟମିତ ସପ୍ତାହାନ୍ତ ସଭା ଏବଂ ସ୍ଥାନୀୟ କାର୍ଯ୍ୟକ୍ରମ।',
    category: 'regional',
    categoryLabel: 'Regional',
    categoryLabelOdia: 'ଆଞ୍ଚଳିକ',
    memberCount: 1420,
    coverUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=60',
    isJoined: true,
  },
  {
    id: 'g2',
    name: 'Samaja Matrimonial Hub',
    nameOdia: 'ସମାଜ ବୈବାହିକ କେନ୍ଦ୍ର',
    description: 'Connecting families for matrimonial alliances. Post and find verified candidates profiles.',
    descriptionOdia: 'ବୈବାହିକ ସମ୍ବନ୍ଧ ପାଇଁ ପରିବାରକୁ ଯୋଡୁଛି। ଯୋଗ୍ୟ ପାତ୍ର/ପାତ୍ରୀ ପ୍ରୋଫାଇଲ୍ ସୂଚନା ପାଆନ୍ତୁ।',
    category: 'matrimony',
    categoryLabel: 'Matrimony',
    categoryLabelOdia: 'ବିବାହ',
    memberCount: 890,
    coverUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&auto=format&fit=crop&q=60',
    isJoined: false,
  },
  {
    id: 'g3',
    name: 'Pandara Youth Wing',
    nameOdia: 'ପଣ୍ଡାର ଯୁବ ସଂଘ',
    description: 'Platform for the youth to coordinate sports, career guidance, and social volunteering.',
    descriptionOdia: 'ଯୁବପିଢିଙ୍କ ପାଇଁ କ୍ରୀଡା, କ୍ୟାରିୟର ମାର୍ଗଦର୍ଶନ ଏବଂ ସେବା କାର୍ଯ୍ୟର ସମନ୍ୱୟ ପ୍ଲାଟଫର୍ମ।',
    category: 'youth',
    categoryLabel: 'Youth',
    categoryLabelOdia: 'ଯୁବକ',
    memberCount: 2150,
    coverUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=60',
    isJoined: false,
  },
  {
    id: 'g4',
    name: 'Odisha Temple Sevayats',
    nameOdia: 'ଓଡ଼ିଶା ମନ୍ଦିର ସେବାୟତ ସମୂହ',
    description: 'Dedicated group discussing traditional rituals, heritage preservation, and welfare.',
    descriptionOdia: 'ପାରମ୍ପରିକ ରୀତିନୀତି, ଐତିହ୍ୟ ସଂରକ୍ଷଣ ଏବଂ କଲ୍ୟାଣ ବିଷୟରେ ଆଲୋଚନା ପାଇଁ ସମୂହ।',
    category: 'social',
    categoryLabel: 'Social',
    categoryLabelOdia: 'ସାମାଜିକ',
    memberCount: 650,
    coverUrl: 'https://images.unsplash.com/photo-1600100397608-f010b423b971?w=600&auto=format&fit=crop&q=60',
    isJoined: true,
  },
  {
    id: 'g5',
    name: 'Pandara Entrepreneurs',
    nameOdia: 'ପଣ୍ଡାର ଉଦ୍ୟୋଗୀ ମଞ୍ଚ',
    description: 'Professional networking, business collaborations, and resource sharing for entrepreneurs.',
    descriptionOdia: 'ଉଦ୍ୟୋଗୀମାନଙ୍କ ପାଇଁ ବ୍ୟବସାୟିକ ନେଟୱର୍କିଙ୍ଗ, ସହଯୋଗ ଏବଂ ସମ୍ପଦର ଭାଗିଦାରୀ।',
    category: 'professional',
    categoryLabel: 'Professional',
    categoryLabelOdia: 'ପେଶାଦାର',
    memberCount: 420,
    coverUrl: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=600&auto=format&fit=crop&q=60',
    isJoined: false,
  },
  {
    id: 'g6',
    name: 'Womens Welfare Forum',
    nameOdia: 'ମହିଳା କଲ୍ୟାଣ ମଞ୍ଚ',
    description: 'Empowering women in the community. Facilitating skill training, healthcare, and education support.',
    descriptionOdia: 'ସମାଜରେ ମହିଳାମାନଙ୍କୁ ସଶକ୍ତିକରଣ। ଦକ୍ଷତା ପ୍ରଶିକ୍ଷଣ, ସ୍ୱାସ୍ଥ୍ୟ ଏବଂ ଶିକ୍ଷା ସହାୟତା।',
    category: 'social',
    categoryLabel: 'Social',
    categoryLabelOdia: 'ମହିଳା',
    memberCount: 780,
    coverUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&auto=format&fit=crop&q=60',
    isJoined: false,
  }
];

function GroupSkeleton() {
  return (
    <View style={{ padding: 16, gap: 16 }}>
      {[1, 2, 3].map(i => (
        <View key={i} style={{ backgroundColor: C.card, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
          <SkeletonBox width="100%" height={120} borderRadius={0} />
          <View style={{ padding: 16, gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <SkeletonBox width="60%" height={16} />
              <SkeletonBox width="20%" height={12} />
            </View>
            <SkeletonBox width="100%" height={12} />
            <SkeletonBox width="80%" height={12} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <SkeletonBox width={100} height={20} borderRadius={10} />
              <SkeletonBox width={80} height={36} borderRadius={18} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function GroupsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { lang } = useLanguage();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGroups = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Simulate API fetch delay
      await new Promise(resolve => setTimeout(resolve, 800));
      setGroups(MOCK_GROUPS);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to fetch groups');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fetchGroups(true);
  };

  const handleJoinToggle = (groupId: string, groupName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGroups(prev =>
      prev.map(g => {
        if (g.id === groupId) {
          const nextJoined = !g.isJoined;
          Toast.show({
            type: 'success',
            text1: nextJoined
              ? (lang === 'od' ? 'ଗ୍ରୁପ୍‌ରେ ଯୋଗ ଦେଲେ!' : 'Joined Group!')
              : (lang === 'od' ? 'ଗ୍ରୁପ୍ ଛାଡିଲେ!' : 'Left Group!'),
            text2: nextJoined
              ? (lang === 'od' ? `ଆପଣ ${g.nameOdia} ରେ ଯୋଗ ଦେଇଛନ୍ତି` : `You are now a member of ${groupName}`)
              : (lang === 'od' ? `ଆପଣ ${g.nameOdia} ରୁ ବାହାରି ଯାଇଛନ୍ତି` : `You left ${groupName}`),
            visibilityTime: 3000,
          });
          return {
            ...g,
            isJoined: nextJoined,
            memberCount: nextJoined ? g.memberCount + 1 : g.memberCount - 1,
          };
        }
        return g;
      })
    );
  };

  const handleCategoryPress = (category: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveCategory(category);
  };

  const categories = useMemo(() => [
    { id: 'all', label: 'All Groups', labelOdia: 'ସମସ୍ତ ଗ୍ରୁପ୍' },
    { id: 'regional', label: 'Regional', labelOdia: 'ଆଞ୍ଚଳିକ' },
    { id: 'matrimony', label: 'Matrimony', labelOdia: 'ବିବାହ' },
    { id: 'youth', label: 'Youth', labelOdia: 'ଯୁବକ' },
    { id: 'social', label: 'Social', labelOdia: 'ସାମାଜିକ' },
    { id: 'professional', label: 'Professional', labelOdia: 'ପେଶାଦାର' }
  ], []);

  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      const matchSearch = (lang === 'od' ? g.nameOdia : g.name).toLowerCase().includes(search.toLowerCase()) ||
                          (lang === 'od' ? g.descriptionOdia : g.description).toLowerCase().includes(search.toLowerCase());
      const matchCategory = activeCategory === 'all' || g.category === activeCategory;
      return matchSearch && matchCategory;
    });
  }, [groups, search, activeCategory, lang]);

  const renderGroupItem = useCallback(({ item }: { item: Group }) => {
    return (
      <View style={{
        backgroundColor: C.card,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: C.border,
      }}>
        {/* Cover Image */}
        <View style={{ height: 130, width: '100%', position: 'relative' }}>
          <Image
            source={{ uri: item.coverUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
          <View style={{
            position: 'absolute',
            top: 12,
            right: 12,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: C.border,
          }}>
            <Text style={{ color: C.text, fontSize: 11, fontWeight: '700' }}>
              {lang === 'od' ? item.categoryLabelOdia : item.categoryLabel}
            </Text>
          </View>
        </View>

        {/* Content */}
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: C.text, fontSize: 17, fontWeight: '700', flex: 1, marginRight: 8, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }}>
              {lang === 'od' ? item.nameOdia : item.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Users size={14} color={C.textMuted} />
              <Text style={{ color: C.textMuted, fontSize: 12, fontWeight: '600' }}>
                {item.memberCount}
              </Text>
            </View>
          </View>

          <Text style={{ color: C.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 16, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }}>
            {lang === 'od' ? item.descriptionOdia : item.description}
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <ShieldCheck size={16} color={C.success} />
              <Text style={{ color: C.success, fontSize: 12, fontWeight: '600' }}>
                {lang === 'od' ? 'ଯୋଗ୍ୟ ସଦସ୍ୟ' : 'Verified Group'}
              </Text>
            </View>

            {item.isJoined ? (
              <TouchableOpacity
                onPress={() => handleJoinToggle(item.id, item.name)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'transparent',
                  borderWidth: 1.5,
                  borderColor: C.success,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  gap: 4,
                }}
              >
                <Check size={16} color={C.success} />
                <Text style={{ color: C.success, fontSize: 13, fontWeight: '700' }}>
                  {lang === 'od' ? 'ଯୋଗଦେଇଛନ୍ତି ✓' : 'Joined ✓'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => handleJoinToggle(item.id, item.name)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: C.primary,
                  paddingHorizontal: 18,
                  paddingVertical: 8,
                  borderRadius: 20,
                  gap: 4,
                }}
              >
                <Plus size={16} color="white" />
                <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>
                  {lang === 'od' ? 'ଯୋଗ ଦିଅନ୍ତୁ' : 'Join Group'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }, [lang]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: C.card,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
      }}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
          style={{ marginRight: 16, padding: 4 }}
        >
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontSize: 18, fontWeight: '700', fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }}>
          {lang === 'od' ? 'ସମାଜ ଗ୍ରୁପ୍ ଗୁଡିକ' : 'Community Groups'}
        </Text>
      </View>

      {/* Inline Search Bar */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: C.card,
          borderRadius: 12,
          paddingHorizontal: 12,
          height: 44,
          borderWidth: 1,
          borderColor: C.border,
        }}>
          <Search size={18} color={C.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            placeholder={lang === 'od' ? 'ଗ୍ରୁପ୍ ଖୋଜନ୍ତୁ...' : 'Search groups...'}
            placeholderTextColor={C.textFaint}
            value={search}
            onChangeText={(text) => setSearch(text)}
            style={{
              flex: 1,
              color: C.text,
              fontSize: 14,
              fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined,
            }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSearch('');
            }}>
              <X size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Horizontal Category Chips */}
      <View style={{ paddingVertical: 10 }}>
        <FlashList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          renderItem={({ item }) => {
            const isActive = activeCategory === item.id;
            return (
              <TouchableOpacity
                onPress={() => handleCategoryPress(item.id)}
                style={{
                  backgroundColor: isActive ? C.primary : C.card,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor: isActive ? C.primary : C.border,
                }}
              >
                <Text style={{
                  color: isActive ? 'white' : C.textMuted,
                  fontSize: 13,
                  fontWeight: '600',
                  fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined
                }}>
                  {lang === 'od' ? item.labelOdia : item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Main List */}
      {loading ? (
        <GroupSkeleton />
      ) : filteredGroups.length === 0 ? (
        <EmptyState
          emoji="👥"
          title={lang === 'od' ? 'କୌଣସି ଗ୍ରୁପ୍ ମିଳିଲା ନାହିଁ' : 'No Groups Found'}
          subtitle={lang === 'od' ? 'ଅନ୍ୟ ସନ୍ଧାନ ସର୍ତ୍ତ ଚେଷ୍ଟା କରନ୍ତୁ' : 'Try adjusting your search query or categories.'}
          action={{
            label: lang === 'od' ? 'ସମସ୍ତ ଗ୍ରୁପ୍ ଦେଖନ୍ତୁ' : 'Show All Groups',
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSearch('');
              setActiveCategory('all');
            }
          }}
        />
      ) : (
        <FlashList
          data={filteredGroups}
          keyExtractor={item => item.id}
          renderItem={renderGroupItem}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={C.primaryLight}
              colors={[C.primary]}
              progressBackgroundColor={C.card}
            />
          }
        />
      )}
    </View>
  );
}
