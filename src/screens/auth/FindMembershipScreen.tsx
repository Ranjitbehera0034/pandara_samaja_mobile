// src/screens/auth/FindMembershipScreen.tsx
// Pre-login self-service lookup for members who've forgotten their
// membership number — search by a name (their own, or a family member's)
// plus their exact district/taluka/panchayat/village. On a match, shows
// the membership number and a masked hint of the registered mobile number
// (last 4 digits only — the backend never returns the full number here),
// then lets them jump straight to Login with the number pre-filled.
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ArrowLeft, ChevronDown, Search, Phone } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { AuthStackParams } from '../../navigation/AuthStack';
import { fetchFindMembershipLocationOptions, searchMembership, FindMembershipMatch, LocationOptions } from '../../api/findMembership';
import Button from '../../components/common/Button';

type Nav = StackNavigationProp<AuthStackParams, 'FindMembership'>;

type LocationField = 'district' | 'taluka' | 'panchayat' | 'village';

export default function FindMembershipScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [options, setOptions] = useState<LocationOptions | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [name, setName] = useState('');
  const [district, setDistrict] = useState('');
  const [taluka, setTaluka] = useState('');
  const [panchayat, setPanchayat] = useState('');
  const [village, setVillage] = useState('');

  const [pickerField, setPickerField] = useState<LocationField | null>(null);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [matches, setMatches] = useState<FindMembershipMatch[]>([]);

  useEffect(() => {
    fetchFindMembershipLocationOptions()
      .then((data) => { if (data.success) setOptions(data.filters); })
      .catch(() => {
        Alert.alert(t('common', 'errorTitle'), t('auth', 'findMembershipLoadOptionsError'));
      })
      .finally(() => setLoadingOptions(false));
  }, [t]);

  const talukaOptions = district ? (options?.talukas?.[district] || []) : [];
  const panchayatOptions = taluka ? (options?.panchayats?.[taluka] || []) : [];
  const villageOptions = panchayat ? (options?.villages?.[panchayat] || []) : [];

  const pickerOptions: Record<LocationField, string[]> = {
    district: options?.districts || [],
    taluka: talukaOptions,
    panchayat: panchayatOptions,
    village: villageOptions,
  };

  const selectLocationValue = (field: LocationField, value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (field === 'district') {
      setDistrict(value); setTaluka(''); setPanchayat(''); setVillage('');
    } else if (field === 'taluka') {
      setTaluka(value); setPanchayat(''); setVillage('');
    } else if (field === 'panchayat') {
      setPanchayat(value); setVillage('');
    } else {
      setVillage(value);
    }
    setPickerField(null);
  };

  const isValid = name.trim().length > 0 && !!district && !!taluka;

  const handleSearch = async () => {
    if (!isValid) {
      Alert.alert(t('common', 'errorTitle'), t('auth', 'findMembershipIncompleteError'));
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSearching(true);
    setSearched(false);
    try {
      const data = await searchMembership({
        name: name.trim(),
        district,
        taluka,
        ...(panchayat ? { panchayat } : {}),
        ...(village ? { village } : {}),
      });
      setMatches(data.success ? data.matches : []);
      setSearched(true);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (e?.response?.status === 429) {
        Alert.alert(t('common', 'errorTitle'), t('auth', 'findMembershipRateLimitError'));
      } else {
        Alert.alert(t('common', 'errorTitle'), t('auth', 'findMembershipSearchError'));
      }
    } finally {
      setSearching(false);
    }
  };

  const goToLoginWith = (membershipNo: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Login', { prefillMembershipNo: membershipNo });
  };

  const fieldStyle = {
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const,
    borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border,
  };
  const labelStyle = { color: C.textMuted, marginBottom: spacing.sm, fontFamily: fontBold, ...typography.label };

  const LocationPickerField = ({ field, labelKey, value }: { field: LocationField; labelKey: string; value: string }) => {
    const parentReady = field === 'district' || pickerOptions[field].length > 0 || value;
    const disabled = !parentReady && !value;
    return (
      <>
        <Text style={labelStyle}>{t('auth', labelKey)}</Text>
        <TouchableOpacity
          disabled={disabled}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPickerField(field); }}
          style={[fieldStyle, disabled && { opacity: 0.5 }]}
        >
          <Text style={{ color: value ? C.text : C.textFaint, fontFamily: fontRegular, ...typography.body }}>
            {value || t('auth', 'findMembershipSelectPlaceholder')}
          </Text>
          <ChevronDown size={18} color={C.textFaint} />
        </TouchableOpacity>
      </>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, ...typography.heading }}>{t('auth', 'findMembershipTitle')}</Text>
      </View>

      {loadingOptions ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }} keyboardShouldPersistTaps="handled">
          <Text style={{ color: C.textMuted, marginBottom: spacing.xl, fontFamily: fontRegular, ...typography.body }}>
            {t('auth', 'findMembershipIntro')}
          </Text>

          <Text style={labelStyle}>{t('auth', 'findMembershipNameLabel')}</Text>
          <TextInput
            style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.xs, backgroundColor: C.card, borderColor: C.border, color: C.text, fontFamily: fontRegular, ...typography.body }}
            placeholder={t('auth', 'findMembershipNamePlaceholder')}
            placeholderTextColor={C.textFaint}
            value={name}
            onChangeText={setName}
          />
          <Text style={{ color: C.textFaint, marginBottom: spacing.lg, fontFamily: fontRegular, ...typography.caption }}>
            {t('auth', 'findMembershipNameHelp')}
          </Text>

          <LocationPickerField field="district" labelKey="findMembershipDistrictLabel" value={district} />
          <LocationPickerField field="taluka" labelKey="findMembershipTalukaLabel" value={taluka} />
          <LocationPickerField field="panchayat" labelKey="findMembershipPanchayatLabel" value={panchayat} />
          <LocationPickerField field="village" labelKey="findMembershipVillageLabel" value={village} />

          <Button
            variant="primary"
            label={t('auth', 'findMembershipSearchButton')}
            icon={<Search size={16} color="#fff" />}
            onPress={handleSearch}
            loading={searching}
            disabled={!isValid}
          />

          {searched && (
            <View style={{ marginTop: spacing.xxl }}>
              {matches.length === 0 ? (
                <Text style={{ color: C.textMuted, textAlign: 'center', fontFamily: fontRegular, ...typography.body }}>
                  {t('auth', 'findMembershipNoResults')}
                </Text>
              ) : (
                matches.map((m) => (
                  <TouchableOpacity
                    key={m.membershipNo}
                    onPress={() => goToLoginWith(m.membershipNo)}
                    style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.card }}
                  >
                    <Text style={{ color: C.text, fontFamily: fontBold, ...typography.bodyEmphasis }}>{m.name}</Text>
                    <Text style={{ color: C.primary, marginTop: spacing.xs, fontFamily: fontBold, ...typography.body, fontWeight: '700' }}>
                      {t('auth', 'findMembershipMembershipNoPrefix')} {m.membershipNo}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm }}>
                      <Phone size={14} color={C.textMuted} />
                      <Text style={{ color: C.textMuted, fontFamily: fontRegular, ...typography.caption }}>{m.maskedMobile}</Text>
                    </View>
                    <Text style={{ color: C.primaryLight, marginTop: spacing.md, fontFamily: fontBold, ...typography.caption, fontWeight: '700' }}>
                      {t('auth', 'findMembershipUseThisButton')}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}

      <Modal visible={!!pickerField} animationType="slide" transparent onRequestClose={() => setPickerField(null)}>
        <View style={{ flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '70%', paddingBottom: insets.bottom + spacing.lg }}>
            <Text style={{ color: C.text, fontFamily: fontBold, padding: spacing.lg, ...typography.title }}>
              {pickerField ? t('auth', `findMembership${pickerField.charAt(0).toUpperCase()}${pickerField.slice(1)}Label`) : ''}
            </Text>
            <ScrollView>
              {(pickerField ? pickerOptions[pickerField] : []).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => pickerField && selectLocationValue(pickerField, opt)}
                  style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 0.5, borderBottomColor: C.border }}
                >
                  <Text style={{ color: C.text, fontFamily: fontRegular, ...typography.body }}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
