// src/screens/community/MatrimonyScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
  Dimensions,
  Platform
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { ArrowLeft, Heart, X, MapPin, Briefcase, GraduationCap, Calendar, UserCheck } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import SkeletonBox from '../../components/common/SkeletonBox';
import EmptyState from '../../components/common/EmptyState';
import { Image } from 'expo-image';

const { width: W, height: H } = Dimensions.get('window');

interface Candidate {
  id: string;
  name: string;
  nameOdia: string;
  gender: 'male' | 'female';
  age: number;
  height: string;
  education: string;
  educationOdia: string;
  occupation: string;
  occupationOdia: string;
  location: string;
  locationOdia: string;
  gotra: string;
  gotraOdia: string;
  photoUrl: string;
  parents: string;
  parentsOdia: string;
  isShortlisted: boolean;
  isInterestSent: boolean;
}

const MOCK_CANDIDATES: Candidate[] = [
  {
    id: 'c1',
    name: 'Satyajit Das',
    nameOdia: 'ସତ୍ୟଜିତ୍ ଦାସ',
    gender: 'male',
    age: 28,
    height: "5'10\"",
    education: 'B.Tech Computer Science',
    educationOdia: 'ବି.ଟେକ୍ କମ୍ପ୍ୟୁଟର ସାଇନ୍ସ',
    occupation: 'Software Engineer at TCS',
    occupationOdia: 'ସଫ୍ଟୱେର୍ ଇଞ୍ଜିନିୟର୍, TCS',
    location: 'Bhubaneswar, Khordha',
    locationOdia: 'ଭୁବନେଶ୍ୱର, ଖୋର୍ଦ୍ଧା',
    gotra: 'Nageswar',
    gotraOdia: 'ନାଗେଶ୍ୱର',
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=80',
    parents: 'Late Sarat Das (Father, Retd. Teacher) & Sabita Das (Mother)',
    parentsOdia: 'ସ୍ୱର୍ଗତ ଶରତ ଦାସ (ପିତା, ଅବସରପ୍ରାପ୍ତ ଶିକ୍ଷକ) ଓ ସବିତା ଦାସ (ମାତା)',
    isShortlisted: false,
    isInterestSent: false,
  },
  {
    id: 'c2',
    name: 'Priyanka Behera',
    nameOdia: 'ପ୍ରିୟଙ୍କା ବେହେରା',
    gender: 'female',
    age: 26,
    height: "5'4\"",
    education: 'MBA in Human Resources',
    educationOdia: 'ଏମ.ବି.ଏ, ମାନବ ସମ୍ବଳ',
    occupation: 'HR Manager at Infosys',
    occupationOdia: 'ମାନବ ସମ୍ବଳ ପ୍ରବନ୍ଧକ, ଇନଫୋସିସ୍',
    location: 'Cuttack Sadar',
    locationOdia: 'କଟକ ସଦର',
    gotra: 'Kashyap',
    gotraOdia: 'କଶ୍ୟପ',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80',
    parents: 'Rabindra Behera (Father, Businessman) & Minati Behera (Mother)',
    parentsOdia: 'ରବୀନ୍ଦ୍ର ବେହେରା (ପିତା, ବ୍ୟବସାୟୀ) ଓ ମିନତୀ ବେହେରା (ମାତା)',
    isShortlisted: true,
    isInterestSent: false,
  },
  {
    id: 'c3',
    name: 'Deepak Kumar Samal',
    nameOdia: 'ଦୀପକ କୁମାର ସାମଲ',
    gender: 'male',
    age: 29,
    height: "5'8\"",
    education: 'M.Sc in Agriculture',
    educationOdia: 'ଏମ.ଏସସି, କୃଷି ବିଜ୍ଞାନ',
    occupation: 'Agriculture Extension Officer',
    occupationOdia: 'କୃଷି ସମ୍ପ୍ରସାରଣ ଅଧିକାରୀ',
    location: 'Balasore Town',
    locationOdia: 'ବାଲେଶ୍ୱର ସହର',
    gotra: 'Gautam',
    gotraOdia: 'ଗୌତମ',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80',
    parents: 'Prafulla Samal (Father, Farmer) & Gouri Samal (Mother)',
    parentsOdia: 'ପ୍ରଫୁଲ୍ଲ ସାମଲ (ପିତା, କୃଷକ) ଓ ଗୌରୀ ସାମଲ (ମାତା)',
    isShortlisted: false,
    isInterestSent: true,
  },
  {
    id: 'c4',
    name: 'Tanmayee Jena',
    nameOdia: 'ତନ୍ମୟୀ ଜେନା',
    gender: 'female',
    age: 25,
    height: "5'2\"",
    education: 'BAMS (Ayurvedic Doctor)',
    educationOdia: 'ବି.ଏ.ଏମ.ଏସ (ଆୟୁର୍ବେଦିକ ଡାକ୍ତର)',
    occupation: 'Consultant at Govt Hospital',
    occupationOdia: 'ସରକାରୀ ଚିକିତ୍ସାଳୟ ପରାମର୍ଶଦାତା',
    location: 'Puri District',
    locationOdia: 'ପୁରୀ ଜିଲ୍ଲା',
    gotra: 'Bharadwaj',
    gotraOdia: 'ଭରଦ୍ୱାଜ',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    parents: 'Dr. Kailash Chandra Jena (Father, Pediatrician) & Pushpalata Jena (Mother)',
    parentsOdia: 'ଡାକ୍ତର କୈଳାଶ ଚନ୍ଦ୍ର ଜେନା (ପିତା, ଶିଶୁରୋଗ ବିଶେଷଜ୍ଞ) ଓ ପୁଷ୍ପଲତା ଜେନା (ମାତା)',
    isShortlisted: false,
    isInterestSent: false,
  }
];

function MatrimonySkeleton({ colors: C }: { colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={{ padding: 16, gap: 16 }}>
      {[1, 2].map(i => (
        <View key={i} style={{ backgroundColor: C.card, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
          <SkeletonBox width="100%" height={200} borderRadius={0} />
          <View style={{ padding: 16, gap: 10 }}>
            <SkeletonBox width="50%" height={16} />
            <SkeletonBox width="35%" height={12} />
            <SkeletonBox width="80%" height={12} />
            <SkeletonBox width="60%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function MatrimonyScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { lang, t } = useLanguage();
  const { colors: C } = useTheme();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const fetchCandidates = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setCandidates(MOCK_CANDIDATES);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fetchCandidates(true);
  };

  const handleGenderFilter = (gender: 'all' | 'male' | 'female') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGenderFilter(gender);
  };

  const handleShortlistToggle = (id: string, name: string, event: any) => {
    event.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCandidates(prev =>
      prev.map(c => {
        if (c.id === id) {
          const nextShort = !c.isShortlisted;
          const displayName = lang === 'od' ? c.nameOdia : name;
          Toast.show({
            type: 'success',
            text1: nextShort ? t('matrimony', 'shortlistAddedTitle') : t('matrimony', 'shortlistRemovedTitle'),
            text2: nextShort
              ? `${t('matrimony', 'shortlistAddedMessagePrefix')} ${displayName} ${t('matrimony', 'shortlistAddedMessageSuffix')}`.trim()
              : `${t('matrimony', 'shortlistRemovedMessagePrefix')} ${displayName} ${t('matrimony', 'shortlistRemovedMessageSuffix')}`.trim(),
            visibilityTime: 2000,
          });
          return { ...c, isShortlisted: nextShort };
        }
        return c;
      })
    );
  };

  const handleSendInterest = (id: string, name: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCandidates(prev =>
      prev.map(c => {
        if (c.id === id) {
          const nextInterest = !c.isInterestSent;
          const displayName = lang === 'od' ? c.nameOdia : name;
          Toast.show({
            type: 'success',
            text1: nextInterest ? t('matrimony', 'interestExpressedToastTitle') : t('matrimony', 'interestRetractedToastTitle'),
            text2: nextInterest
              ? `${t('matrimony', 'interestExpressedMessagePrefix')} ${displayName}${t('matrimony', 'interestExpressedMessageSuffix')}`.trim()
              : `${t('matrimony', 'interestCanceledMessagePrefix')} ${displayName} ${t('matrimony', 'interestCanceledMessageSuffix')}`.trim(),
          });
          if (selectedCandidate?.id === id) {
            setSelectedCandidate(prevSelected => prevSelected ? { ...prevSelected, isInterestSent: nextInterest } : null);
          }
          return { ...c, isInterestSent: nextInterest };
        }
        return c;
      })
    );
  };

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      if (genderFilter === 'all') return true;
      return c.gender === genderFilter;
    });
  }, [candidates, genderFilter]);

  const renderCandidateItem = useCallback(({ item }: { item: Candidate }) => {
    return (
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedCandidate(item);
        }}
        style={{
          backgroundColor: C.card,
          borderRadius: 16,
          overflow: 'hidden',
          marginBottom: 16,
          borderWidth: 1,
          borderColor: C.border,
        }}
      >
        {/* Photo Top */}
        <View style={{ height: 220, width: '100%', position: 'relative' }}>
          <Image
            source={{ uri: item.photoUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
          {/* Heart Shortlist Overlay */}
          <TouchableOpacity
            onPress={(e) => handleShortlistToggle(item.id, item.name, e)}
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.2)',
            }}
          >
            <Heart
              size={18}
              color={item.isShortlisted ? C.female : 'white'}
              fill={item.isShortlisted ? C.female : 'transparent'}
            />
          </TouchableOpacity>

          {/* Gender Label Tag */}
          <View style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            backgroundColor: item.gender === 'male' ? C.male : C.female,
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 8,
          }}>
            <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>
              {item.gender === 'male' ? t('matrimony', 'groomTag') : t('matrimony', 'brideTag')}
            </Text>
          </View>
        </View>

        {/* Info Below */}
        <View style={{ padding: 16 }}>
          <Text style={{ color: C.text, fontSize: 18, fontWeight: '700', fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }}>
            {lang === 'od' ? item.nameOdia : item.name}, {item.age}
          </Text>

          <Text style={{ color: C.primaryLight, fontSize: 13, fontWeight: '600', marginTop: 4, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }}>
            {t('matrimony', 'gotraLabel')} {lang === 'od' ? item.gotraOdia : item.gotra}
          </Text>

          <View style={{ marginTop: 12, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <GraduationCap size={15} color={C.textMuted} />
              <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }}>
                {lang === 'od' ? item.educationOdia : item.education}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Briefcase size={15} color={C.textMuted} />
              <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }}>
                {lang === 'od' ? item.occupationOdia : item.occupation}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MapPin size={15} color={C.textMuted} />
              <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }}>
                {lang === 'od' ? item.locationOdia : item.location}
              </Text>
            </View>
          </View>

          {item.isInterestSent && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: C.success + '15',
              padding: 8,
              borderRadius: 8,
              marginTop: 14,
              borderWidth: 1,
              borderColor: C.success + '30',
            }}>
              <UserCheck size={14} color={C.success} />
              <Text style={{ color: C.success, fontSize: 12, fontWeight: '600' }}>
                {t('matrimony', 'interestExpressedCard')}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [lang]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      {/* Application status banner (simulated) */}
      <View style={{
        backgroundColor: C.accent + '20',
        borderBottomWidth: 1,
        borderColor: C.accent + '40',
        paddingVertical: 8,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <UserCheck size={14} color={C.accent} style={{ marginRight: 6 }} />
        <Text style={{ color: C.text, fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
          {t('matrimony', 'verifiedBanner')}
        </Text>
      </View>

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
          {t('matrimony', 'title')}
        </Text>
      </View>

      {/* Gender Segmented Control */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <View style={{
          flexDirection: 'row',
          backgroundColor: C.card,
          padding: 4,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: C.border,
        }}>
          <TouchableOpacity
            onPress={() => handleGenderFilter('all')}
            style={{
              flex: 1,
              backgroundColor: genderFilter === 'all' ? C.primary : 'transparent',
              paddingVertical: 8,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{
              color: genderFilter === 'all' ? 'white' : C.textMuted,
              fontWeight: '700',
              fontSize: 13,
              fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined
            }}>
              {t('matrimony', 'filterAll')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleGenderFilter('female')}
            style={{
              flex: 1,
              backgroundColor: genderFilter === 'female' ? C.female : 'transparent',
              paddingVertical: 8,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{
              color: genderFilter === 'female' ? 'white' : C.textMuted,
              fontWeight: '700',
              fontSize: 13,
              fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined
            }}>
              {t('matrimony', 'filterBrides')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleGenderFilter('male')}
            style={{
              flex: 1,
              backgroundColor: genderFilter === 'male' ? C.male : 'transparent',
              paddingVertical: 8,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{
              color: genderFilter === 'male' ? 'white' : C.textMuted,
              fontWeight: '700',
              fontSize: 13,
              fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined
            }}>
              {t('matrimony', 'filterGrooms')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Candidates List */}
      {loading ? (
        <MatrimonySkeleton colors={C} />
      ) : filteredCandidates.length === 0 ? (
        <EmptyState
          emoji="💍"
          title={t('matrimony', 'emptyTitle')}
          subtitle={t('matrimony', 'emptySubtitle')}
          action={{
            label: t('matrimony', 'resetFilter'),
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setGenderFilter('all');
            }
          }}
        />
      ) : (
        <FlashList
          data={filteredCandidates}
          keyExtractor={item => item.id}
          renderItem={renderCandidateItem}
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

      {/* Candidate Detailed Overlay Modal */}
      {selectedCandidate && (
        <Modal
          visible={!!selectedCandidate}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSelectedCandidate(null)}
        >
          <View style={{ flex: 1, backgroundColor: C.bg }}>
            {/* Modal Image Header */}
            <View style={{ height: H * 0.4, position: 'relative' }}>
              <Image
                source={{ uri: selectedCandidate.photoUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCandidate(null);
                }}
                style={{
                  position: 'absolute',
                  top: 20,
                  right: 20,
                  backgroundColor: 'rgba(15, 23, 42, 0.7)',
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={20} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
              {/* Profile Main info */}
              <View style={{ borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: C.text, fontSize: 24, fontWeight: '800', fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }}>
                    {lang === 'od' ? selectedCandidate.nameOdia : selectedCandidate.name}
                  </Text>
                  <Text style={{ color: C.text, fontSize: 20, fontWeight: '700' }}>
                    {selectedCandidate.age} {t('matrimony', 'yearsAbbrev')}
                  </Text>
                </View>
                <Text style={{ color: C.primaryLight, fontSize: 15, fontWeight: '600', marginTop: 4, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }}>
                  {t('matrimony', 'gotraLabel')} {lang === 'od' ? selectedCandidate.gotraOdia : selectedCandidate.gotra}
                </Text>
              </View>

              {/* Personal Details */}
              <View style={{ marginTop: 20 }}>
                <Text style={{ color: C.textMuted, fontSize: 13, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>
                  {t('matrimony', 'profileDetailsHeader')}
                </Text>

                <View style={{ gap: 12 }}>
                  {/* Height */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: C.border }}>
                    <Text style={{ color: C.textMuted, fontSize: 14 }}>{t('matrimony', 'heightLabel')}</Text>
                    <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>{selectedCandidate.height}</Text>
                  </View>

                  {/* Education */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: C.border }}>
                    <Text style={{ color: C.textMuted, fontSize: 14 }}>{t('matrimony', 'educationLabel')}</Text>
                    <Text style={{ color: C.text, fontSize: 14, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 20, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }}>
                      {lang === 'od' ? selectedCandidate.educationOdia : selectedCandidate.education}
                    </Text>
                  </View>

                  {/* Occupation */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: C.border }}>
                    <Text style={{ color: C.textMuted, fontSize: 14 }}>{t('matrimony', 'occupationLabel')}</Text>
                    <Text style={{ color: C.text, fontSize: 14, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 20, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }}>
                      {lang === 'od' ? selectedCandidate.occupationOdia : selectedCandidate.occupation}
                    </Text>
                  </View>

                  {/* Parents */}
                  <View style={{ flexDirection: 'column', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: C.border, gap: 4 }}>
                    <Text style={{ color: C.textMuted, fontSize: 14 }}>{t('matrimony', 'parentsLabel')}</Text>
                    <Text style={{ color: C.text, fontSize: 14, fontWeight: '600', lineHeight: 20, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }}>
                      {lang === 'od' ? selectedCandidate.parentsOdia : selectedCandidate.parents}
                    </Text>
                  </View>

                  {/* Location */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
                    <Text style={{ color: C.textMuted, fontSize: 14 }}>{t('matrimony', 'locationLabel')}</Text>
                    <Text style={{ color: C.text, fontSize: 14, fontWeight: '600', fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }}>
                      {lang === 'od' ? selectedCandidate.locationOdia : selectedCandidate.location}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Actions inside Modal */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 32 }}>
                <TouchableOpacity
                  onPress={(e) => handleShortlistToggle(selectedCandidate.id, selectedCandidate.name, e)}
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    borderWidth: 1.5,
                    borderColor: C.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: C.card,
                  }}
                >
                  <Heart
                    size={22}
                    color={selectedCandidate.isShortlisted ? C.female : C.textMuted}
                    fill={selectedCandidate.isShortlisted ? C.female : 'transparent'}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSendInterest(selectedCandidate.id, selectedCandidate.name)}
                  style={{
                    flex: 1,
                    backgroundColor: selectedCandidate.isInterestSent ? 'transparent' : C.primary,
                    borderWidth: selectedCandidate.isInterestSent ? 1.5 : 0,
                    borderColor: C.success,
                    borderRadius: 25,
                    height: 50,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{
                    color: selectedCandidate.isInterestSent ? C.success : 'white',
                    fontWeight: '700',
                    fontSize: 16,
                  }}>
                    {selectedCandidate.isInterestSent
                      ? t('matrimony', 'interestExpressedModal')
                      : t('matrimony', 'sendInterest')}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
}
