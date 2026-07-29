// src/screens/admin/AdminMemberDetailScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ArrowLeft, Ban, CheckCircle2, Phone, MapPin, Pencil } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import { AdminMember, MemberActivity } from '../../api/admin';
import { AdminStackParams } from '../../navigation/AdminStack';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

type DetailRoute = RouteProp<AdminStackParams, 'AdminMemberDetail'>;

export default function AdminMemberDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<DetailRoute>();
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [member, setMember] = useState<AdminMember | null>(null);
  const [activity, setActivity] = useState<MemberActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [banning, setBanning] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await adminApi.fetchAdminMember(id);
      if (data.success) {
        setMember(data.member);
        setActivity(data.activity);
      }
    } catch (e) {
      console.error('[ADMIN_MEMBER_DETAIL] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'memberLoadError'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => load());
    return unsub;
  }, [navigation, load]);

  const isBanned = !!member?.is_banned;

  const doToggleBan = async () => {
    if (!member) return;
    setBanning(true);
    try {
      const data = await adminApi.setMemberBanned(member.membership_no, !isBanned);
      if (data.success) {
        setMember(data.member);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.error('[ADMIN_MEMBER_DETAIL] Ban toggle failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'banError'));
    } finally {
      setBanning(false);
    }
  };

  const handleBanPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      isBanned ? t('admin', 'confirmUnbanTitle') : t('admin', 'confirmBanTitle'),
      isBanned ? t('admin', 'confirmUnbanMessage') : t('admin', 'confirmBanMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        { text: isBanned ? t('admin', 'unbanButton') : t('admin', 'banButton'), style: 'destructive', onPress: doToggleBan },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, color: C.text, fontFamily: fontBold, ...typography.heading }}>{t('admin', 'memberDetailTitle')}</Text>
        {member && (
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('AdminMemberEdit', { id: member.membership_no }); }}
            style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}
          >
            <Pencil size={20} color={C.text} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : !member ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: C.textMuted, ...typography.body }}>{t('admin', 'memberNotFound')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
          <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
            <Avatar name={member.name} photoUrl={member.profile_photo_url} gender={member.head_gender} size={88} />
            <Text style={{ color: C.text, fontFamily: fontBold, marginTop: spacing.md, ...typography.title }}>{member.name}</Text>
            <Text style={{ color: C.textMuted, marginTop: 2, ...typography.caption }}>#{member.membership_no}</Text>
            <View style={{
              marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 4,
              backgroundColor: (isBanned ? C.error : C.success) + '15', borderRadius: radius.full,
              paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
            }}>
              {isBanned ? <Ban size={12} color={C.error} /> : <CheckCircle2 size={12} color={C.success} />}
              <Text style={{ color: isBanned ? C.error : C.success, ...typography.caption, fontWeight: '700' }}>
                {isBanned ? t('admin', 'bannedBadge') : t('admin', 'activeBadge')}
              </Text>
            </View>
          </View>

          <View style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, gap: spacing.md, ...shadow.card }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Phone size={16} color={C.textMuted} />
              <Text style={{ color: C.text, fontFamily: fontRegular, ...typography.body }}>{member.mobile || '—'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <MapPin size={16} color={C.textMuted} />
              <Text style={{ color: C.text, fontFamily: fontRegular, ...typography.body }}>
                {[member.village, member.panchayat, member.taluka, member.district].filter(Boolean).join(', ') || '—'}
              </Text>
            </View>
          </View>

          {activity && (
            <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl }}>
              {[
                { label: t('admin', 'postsCountLabel'), value: activity.postsCount },
                { label: t('admin', 'reportsAgainstLabel'), value: activity.reportsAgainstCount },
                { label: t('admin', 'reportsFiledLabel'), value: activity.reportsFiledCount },
              ].map((stat, idx) => (
                <View key={idx} style={{ flex: 1, alignItems: 'center', backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, paddingVertical: spacing.lg }}>
                  <Text style={{ color: C.text, fontFamily: fontBold, ...typography.title }}>{stat.value}</Text>
                  <Text style={{ color: C.textMuted, marginTop: 2, textAlign: 'center', ...typography.caption }}>{stat.label}</Text>
                </View>
              ))}
            </View>
          )}

          <Button
            variant="primary"
            label={isBanned ? t('admin', 'unbanButton') : t('admin', 'banButton')}
            onPress={handleBanPress}
            loading={banning}
            icon={<Ban size={16} color="#fff" />}
          />
        </ScrollView>
      )}
    </View>
  );
}
