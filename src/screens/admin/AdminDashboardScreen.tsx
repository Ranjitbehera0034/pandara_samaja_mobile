// src/screens/admin/AdminDashboardScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Users, Flag, ShieldCheck, LogOut, ChevronRight, History, Heart, Newspaper, Megaphone, Wallet, Settings as SettingsIcon, Award, PieChart, TrendingUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function AdminDashboardScreen() {
  const navigation = useNavigation<any>();
  const { adminUser, adminLogout } = useAdminAuth();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const isSuperAdmin = adminUser?.role === 'superadmin';

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('admin', 'confirmLogoutTitle'),
      t('admin', 'confirmLogoutMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        {
          text: t('common', 'logout'),
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await adminLogout();
          },
        },
      ]
    );
  };

  const navigateTo = (screen: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(screen);
  };

  const cards = [
    {
      key: 'members',
      icon: <Users size={24} color={C.primary} />,
      title: t('admin', 'membersCardTitle'),
      desc: t('admin', 'membersCardDesc'),
      onPress: () => navigateTo('AdminMembers'),
    },
    {
      key: 'reports',
      icon: <Flag size={24} color={C.warning} />,
      title: t('admin', 'reportsCardTitle'),
      desc: t('admin', 'reportsCardDesc'),
      onPress: () => navigateTo('AdminReports'),
    },
    {
      key: 'tracker',
      icon: <History size={24} color={C.accent} />,
      title: t('admin', 'trackerCardTitle'),
      desc: t('admin', 'trackerCardDesc'),
      onPress: () => navigateTo('AdminTracker'),
    },
    {
      key: 'matrimony',
      icon: <Heart size={24} color={C.female} />,
      title: t('admin', 'matrimonyCardTitle'),
      desc: t('admin', 'matrimonyCardDesc'),
      onPress: () => navigateTo('AdminMatrimony'),
    },
    {
      key: 'posts',
      icon: <Newspaper size={24} color={C.primary} />,
      title: t('admin', 'postsCardTitle'),
      desc: t('admin', 'postsCardDesc'),
      onPress: () => navigateTo('AdminPosts'),
    },
    {
      key: 'announcements',
      icon: <Megaphone size={24} color={C.warning} />,
      title: t('admin', 'announcementsCardTitle'),
      desc: t('admin', 'announcementsCardDesc'),
      onPress: () => navigateTo('AdminAnnouncements'),
    },
    {
      key: 'expenses',
      icon: <Wallet size={24} color={C.success} />,
      title: t('admin', 'expensesCardTitle'),
      desc: t('admin', 'expensesCardDesc'),
      onPress: () => navigateTo('AdminExpenses'),
    },
    {
      key: 'leaders',
      icon: <Award size={24} color={C.warning} />,
      title: t('admin', 'leadersCardTitle'),
      desc: t('admin', 'leadersCardDesc'),
      onPress: () => navigateTo('AdminLeaders'),
    },
    {
      key: 'demographics',
      icon: <PieChart size={24} color={C.accent} />,
      title: t('admin', 'demographicsCardTitle'),
      desc: t('admin', 'demographicsCardDesc'),
      onPress: () => navigateTo('AdminDemographics'),
    },
    {
      key: 'analytics',
      icon: <TrendingUp size={24} color={C.primary} />,
      title: t('admin', 'analyticsCardTitle'),
      desc: t('admin', 'analyticsCardDesc'),
      onPress: () => navigateTo('AdminAnalytics'),
    },
    {
      key: 'settings',
      icon: <SettingsIcon size={24} color={C.textMuted} />,
      title: t('admin', 'settingsCardTitle'),
      desc: t('admin', 'settingsCardDesc'),
      onPress: () => navigateTo('AdminSettings'),
    },
    ...(isSuperAdmin ? [{
      key: 'users',
      icon: <ShieldCheck size={24} color={C.accent} />,
      title: t('admin', 'usersCardTitle'),
      desc: t('admin', 'usersCardDesc'),
      onPress: () => navigateTo('AdminUsers'),
    }] : []),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
        <View style={{ marginBottom: spacing.xl }}>
          <Text style={{ color: C.text, fontFamily: fontBold, ...typography.display }}>
            {isSuperAdmin ? t('admin', 'superDashboardTitle') : t('admin', 'dashboardTitle')}
          </Text>
          <View
            style={{
              flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm,
              alignSelf: 'flex-start', backgroundColor: C.primary + '15', borderColor: C.primary + '30',
              borderWidth: 1, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
            }}
          >
            <Text style={{ color: C.primary, fontFamily: fontBold, ...typography.caption, fontWeight: '700' }}>
              {adminUser?.username}
            </Text>
            <Text style={{ color: C.primary, ...typography.caption }}>
              · {isSuperAdmin ? t('admin', 'roleSuperadmin') : t('admin', 'roleAdmin')}
            </Text>
          </View>
        </View>

        <View style={{ gap: spacing.md }}>
          {cards.map(card => (
            <TouchableOpacity
              key={card.key}
              onPress={card.onPress}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: spacing.md,
                backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
                borderRadius: radius.lg, padding: spacing.lg, ...shadow.card,
              }}
            >
              <View style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
                {card.icon}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontFamily: fontBold, ...typography.bodyEmphasis }}>{card.title}</Text>
                <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: 2, ...typography.caption }}>{card.desc}</Text>
              </View>
              <ChevronRight size={20} color={C.textFaint} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
            marginTop: spacing.xxl, borderWidth: 1, borderColor: C.error + '40',
            backgroundColor: C.error + '10', borderRadius: radius.lg, paddingVertical: spacing.md,
          }}
        >
          <LogOut size={18} color={C.error} />
          <Text style={{ color: C.error, fontFamily: fontBold, ...typography.bodyEmphasis }}>
            {t('admin', 'logoutButton')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
