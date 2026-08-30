// src/screens/admin/AdminDemographicsScreen.tsx
// Community-wide household demographics — GET /api/admin/members/demographics,
// computed across every member's family_members roster (not the per-member
// household Family Members section added to AdminMemberDetailScreen).
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Users, Mars, Venus, UserCheck, Smile, Baby, Heart, User, PersonStanding } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import { Demographics, AgeGenderBucket } from '../../api/admin';
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

  const SectionCard = ({ children }: { children: React.ReactNode }) => (
    <View style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, ...shadow.card }}>
      {children}
    </View>
  );

  const AgeRow = ({ icon, color, label, bucket, isLast }: { icon: React.ReactNode; color: string; label: string; bucket: AgeGenderBucket; isLast?: boolean }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: C.border }}>
      <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: color + '15', alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontFamily: fontBold, ...typography.bodyEmphasis, fontWeight: '700' }}>{label}</Text>
        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: 2 }}>
          <Text style={{ color: C.male, fontFamily: fontRegular, ...typography.caption }}>♂ {bucket.male}</Text>
          <Text style={{ color: C.female, fontFamily: fontRegular, ...typography.caption }}>♀ {bucket.female}</Text>
        </View>
      </View>
      <Text style={{ color: C.text, fontFamily: fontBold, ...typography.title }}>{bucket.total}</Text>
    </View>
  );

  const MaritalRow = ({ icon, color, label, value, sublabel, isLast }: { icon: React.ReactNode; color: string; label: string; value: number; sublabel?: string; isLast?: boolean }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: C.border }}>
      <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: color + '15', alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontFamily: fontBold, ...typography.bodyEmphasis, fontWeight: '700' }}>{label}</Text>
        {!!sublabel && <Text style={{ color: C.textMuted, marginTop: 2, fontFamily: fontRegular, ...typography.caption }}>{sublabel}</Text>}
      </View>
      <Text style={{ color: C.text, fontFamily: fontBold, ...typography.title }}>{value}</Text>
    </View>
  );

  const BarList = ({ data, labelFor, maxItems = 8 }: { data: { label: string; count: number }[]; labelFor?: (l: string) => string; maxItems?: number }) => {
    if (data.length === 0) {
      return (
        <Text style={{ color: C.textFaint, fontFamily: fontRegular, ...typography.caption, paddingVertical: spacing.sm }}>
          {t('admin', 'demographicsNoDataYet')}
        </Text>
      );
    }
    const shown = data.slice(0, maxItems);
    const max = Math.max(...shown.map(d => d.count), 1);
    return (
      <View style={{ gap: spacing.sm }}>
        {shown.map(d => (
          <View key={d.label}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: C.text, fontFamily: fontRegular, ...typography.caption }}>{labelFor ? labelFor(d.label) : d.label}</Text>
              <Text style={{ color: C.textMuted, fontFamily: fontBold, ...typography.caption, fontWeight: '700' }}>{d.count}</Text>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: C.border, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${Math.max((d.count / max) * 100, 4)}%`, backgroundColor: C.primary, borderRadius: 3 }} />
            </View>
          </View>
        ))}
        {data.length > maxItems && (
          <Text style={{ color: C.textFaint, fontFamily: fontRegular, marginTop: spacing.xs, ...typography.caption }}>
            {t('admin', 'demographicsMoreCount').replace('{n}', String(data.length - maxItems))}
          </Text>
        )}
      </View>
    );
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={{ color: C.text, fontFamily: fontBold, marginTop: spacing.xl, marginBottom: spacing.md, ...typography.title }}>
      {title}
    </Text>
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

          {!!demographics && (
            <View style={{ backgroundColor: C.warning + '15', borderColor: C.warning + '40', borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg }}>
              <Text style={{ color: C.warning, fontFamily: fontBold, ...typography.caption, fontWeight: '700' }}>
                {`${t('admin', 'demographicsDetailHintPrefix')} ${demographics.householdsWithDetailedData.toLocaleString()} ${t('admin', 'demographicsDetailHintOf')} ${demographics.householdsTotal.toLocaleString()} ${t('admin', 'demographicsDetailHintSuffix')}`}
              </Text>
              <Text style={{ color: C.warning, marginTop: 4, fontFamily: fontRegular, ...typography.caption }}>
                {t('admin', 'demographicsSampleWarning')}
              </Text>
            </View>
          )}

          {!!demographics && (
            <>
              <SectionHeader title={t('admin', 'demographicsAgeSectionTitle')} />
              <SectionCard>
                <AgeRow icon={<Baby size={18} color={C.amber} />} color={C.amber} label={t('admin', 'demographicsInfantsLabel')} bucket={demographics.infants} />
                <AgeRow icon={<Smile size={18} color={C.warning} />} color={C.warning} label={t('admin', 'demographicsChildrenLabel')} bucket={demographics.children} />
                <AgeRow icon={<UserCheck size={18} color={C.accent} />} color={C.accent} label={t('admin', 'demographicsAdultsLabel')} bucket={demographics.adults} />
                <AgeRow icon={<PersonStanding size={18} color={C.success} />} color={C.success} label={t('admin', 'demographicsElderlyLabel')} bucket={demographics.elderly} isLast />
              </SectionCard>

              <SectionHeader title={t('admin', 'demographicsMaritalSectionTitle')} />
              <SectionCard>
                <MaritalRow icon={<Heart size={18} color={C.success} />} color={C.success} label={t('admin', 'demographicsMarriedLabel')} value={demographics.married} />
                <MaritalRow
                  icon={<User size={18} color={C.textMuted} />} color={C.textMuted}
                  label={t('admin', 'demographicsUnmarriedLabel')} value={demographics.unmarried.total}
                  sublabel={`${t('admin', 'demographicsUnmarriedMen')}: ${demographics.unmarried.men}  ·  ${t('admin', 'demographicsUnmarriedWomen')}: ${demographics.unmarried.women}`}
                />
                <MaritalRow icon={<User size={18} color={C.error} />} color={C.error} label={t('admin', 'demographicsDivorcedLabel')} value={demographics.divorced} />
                <MaritalRow icon={<User size={18} color={C.male} />} color={C.male} label={t('admin', 'demographicsWidowedLabel')} value={demographics.widowed} isLast />
              </SectionCard>

              <SectionHeader title={t('admin', 'demographicsBloodGroupSectionTitle')} />
              <SectionCard>
                <BarList data={demographics.bloodGroups.map(b => ({ label: b.group, count: b.count }))} />
              </SectionCard>

              <SectionHeader title={t('admin', 'demographicsOccupationSectionTitle')} />
              <SectionCard>
                <BarList data={demographics.occupations.map(o => ({ label: o.occupation, count: o.count }))} maxItems={10} />
              </SectionCard>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}
