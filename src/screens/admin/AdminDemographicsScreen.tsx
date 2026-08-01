// src/screens/admin/AdminDemographicsScreen.tsx
// Community-wide household demographics — GET /api/admin/members/demographics,
// computed across every member's family_members roster (not the per-member
// household Family Members section added to AdminMemberDetailScreen).
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Users, Mars, Venus, UserCheck, Smile, Baby, Heart, User } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import { Demographics } from '../../api/admin';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function AdminDemographicsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [demographics, setDemographics] = useState<Demographics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await adminApi.fetchDemographics();
      if (data.success) setDemographics(data.demographics);
    } catch (e) {
      console.error('[ADMIN_DEMOGRAPHICS] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'demographicsLoadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => load());
    return unsub;
  }, [navigation, load]);

  const onRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    load().finally(() => setRefreshing(false));
  };

  const totalStats = demographics ? [
    { key: 'total', icon: <Users size={22} color={C.primary} />, label: t('admin', 'demographicsTotalLabel'), value: demographics.totalFamilyMembers, color: C.primary },
    { key: 'male', icon: <Mars size={22} color={C.male} />, label: t('admin', 'demographicsMaleLabel'), value: demographics.male, color: C.male },
    { key: 'female', icon: <Venus size={22} color={C.female} />, label: t('admin', 'demographicsFemaleLabel'), value: demographics.female, color: C.female },
  ] : [];

  const detailStats = demographics ? [
    { key: 'adults', icon: <UserCheck size={22} color={C.accent} />, label: t('admin', 'demographicsAdultsLabel'), value: demographics.adults, color: C.accent },
    { key: 'children', icon: <Smile size={22} color={C.warning} />, label: t('admin', 'demographicsChildrenLabel'), value: demographics.children, color: C.warning },
    { key: 'infants', icon: <Baby size={22} color={C.amber} />, label: t('admin', 'demographicsInfantsLabel'), value: demographics.infants, color: C.amber },
    { key: 'married', icon: <Heart size={22} color={C.success} />, label: t('admin', 'demographicsMarriedLabel'), value: demographics.married, color: C.success },
    { key: 'unmarried', icon: <User size={22} color={C.textMuted} />, label: t('admin', 'demographicsUnmarriedLabel'), value: demographics.unmarried, color: C.textMuted },
  ] : [];

  const renderGrid = (stats: typeof totalStats) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
      {stats.map(stat => (
        <View
          key={stat.key}
          style={{
            width: '47%', backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
            borderRadius: radius.lg, padding: spacing.lg, ...shadow.card,
          }}
        >
          <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: stat.color + '15', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }}>
            {stat.icon}
          </View>
          <Text style={{ color: C.text, fontFamily: fontBold, ...typography.display }}>{stat.value}</Text>
          <Text style={{ color: C.textMuted, marginTop: 2, fontFamily: fontRegular, ...typography.caption }}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, ...typography.heading }}>{t('admin', 'demographicsTitle')}</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} progressBackgroundColor={C.card} />}
        >
          <Text style={{ color: C.textMuted, marginBottom: spacing.lg, fontFamily: fontRegular, ...typography.caption }}>
            {t('admin', 'demographicsSubtitle')}
          </Text>

          {renderGrid(totalStats)}

          <Text style={{ color: C.text, fontFamily: fontBold, marginTop: spacing.xl, marginBottom: spacing.xs, ...typography.title }}>
            {t('admin', 'demographicsDetailHeader')}
          </Text>
          {!!demographics && (
            <Text style={{ color: C.textFaint, marginBottom: spacing.lg, fontFamily: fontRegular, ...typography.caption }}>
              {`${t('admin', 'demographicsDetailHintPrefix')} ${demographics.householdsWithDetailedData.toLocaleString()} ${t('admin', 'demographicsDetailHintOf')} ${demographics.householdsTotal.toLocaleString()} ${t('admin', 'demographicsDetailHintSuffix')}`}
            </Text>
          )}

          {renderGrid(detailStats)}
        </ScrollView>
      )}
    </View>
  );
}
