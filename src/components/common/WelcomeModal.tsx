// src/components/common/WelcomeModal.tsx
// Always in Odia regardless of the member's selected app language —
// a deliberate community-culture choice, not driven by LanguageContext.
// On a festival day (see data/odiaFestivals.ts, the same source driving
// the Calendar tab and the Feed header tint), greets with that festival's
// name and its real bundled photo when one exists, plus a falling-petals
// animation — otherwise the plain generic "Jai Jagannath" welcome.
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Sun, Flag, Landmark, Sparkles, Heart, Music, BookOpen, Gift, PartyPopper, Flame,
} from 'lucide-react-native';
import Reanimated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getTodayFestival, FestivalIcon, FESTIVAL_ACCENT_COLOR } from '../../data/odiaFestivals';
import { FESTIVAL_IMAGES } from '../../data/festivalImages';
import FallingPetals from './FestiveDecoration';

const ICONS: Record<FestivalIcon, React.ComponentType<any>> = {
  Sun, Flag, Landmark, Sparkles, Heart, Music, BookOpen, Gift, PartyPopper, Flame,
};

export default function WelcomeModal() {
  const { colors, spacing, radius, typography, shadow } = useTheme();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const festival = getTodayFestival();
  const festivalImage = festival?.imageKey ? FESTIVAL_IMAGES[festival.imageKey] : null;
  const FestivalIconComp = festival ? ICONS[festival.icon] : null;
  const accent = festival?.color || FESTIVAL_ACCENT_COLOR;

  const cardScale = useSharedValue(0.85);
  const cardOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0);

  // Fires once per mount — RootNavigator only mounts this alongside
  // MainTabs when isAuthenticated flips true, so this naturally shows
  // once per login (including a cold start into an already-valid session).
  useEffect(() => {
    setVisible(true);
    cardOpacity.value = withTiming(1, { duration: 250 });
    cardScale.value = withSpring(1, { damping: 12, stiffness: 140 });
    iconScale.value = withDelay(120, withSpring(1, { damping: 8, stiffness: 180 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVisible(false);
  };

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const namePrefix = user?.name ? `${user.name}, ` : '';
  const greetingTitle = festival ? `${festival.or}ର ଶୁଭେଚ୍ଛା` : 'ଜୟ ଜଗନ୍ନାଥ';
  const greetingMessage = festival
    ? `${namePrefix}${festival.or}ର ହାର୍ଦ୍ଦିକ ଶୁଭକାମନା ଓ ଅଭିନନ୍ଦନ। ଏହି ପର୍ବ ଆପଣଙ୍କ ପରିବାରରେ ସୁଖ, ଶାନ୍ତି ଓ ସମୃଦ୍ଧି ଆଣୁ।`
    : `${namePrefix}ପନ୍ଦରା ସମାଜ ଆପ୍‌ରେ ଆପଣଙ୍କୁ ହାର୍ଦ୍ଦିକ ସ୍ୱାଗତ। ଆମ ସମାଜର ସୂଚନା, ଘଟଣା ଏବଂ ସଦସ୍ୟଙ୍କ ସହ ସଂଯୋଗରେ ରୁହନ୍ତୁ।`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
        <Reanimated.View style={[{ width: '100%', maxWidth: 360 }, cardStyle]}>
          <View style={{
            backgroundColor: colors.card,
            borderRadius: radius.xl,
            alignItems: 'center',
            overflow: 'hidden',
            ...shadow.card,
          }}>
            {festivalImage ? (
              <View style={{ width: '100%', height: 150 }}>
                <Image source={festivalImage} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                <LinearGradient colors={['transparent', colors.card]} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60 }} />
                <FallingPetals height={150} count={5} />
              </View>
            ) : festival ? (
              <View style={{ width: '100%', paddingTop: spacing.xl, alignItems: 'center' }}>
                <FallingPetals height={110} count={5} />
              </View>
            ) : null}

            <View style={{ padding: spacing.xl, alignItems: 'center', marginTop: festivalImage ? -36 : 0 }}>
              <Reanimated.View style={iconStyle}>
                {festival ? (
                  <View style={{
                    width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: colors.card,
                    backgroundColor: accent + '15', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
                  }}>
                    {FestivalIconComp && <FestivalIconComp size={32} color={accent} />}
                  </View>
                ) : (
                  <Text style={{ fontSize: 40, marginBottom: spacing.md }}>🙏</Text>
                )}
              </Reanimated.View>

              <Text style={{ color: festival ? accent : colors.text, fontFamily: 'NotoSansOriya-Bold', textAlign: 'center', marginBottom: spacing.sm, ...typography.title }}>
                {greetingTitle}
              </Text>
              <Text style={{ color: colors.textMuted, fontFamily: 'NotoSansOriya', textAlign: 'center', ...typography.body }}>
                {greetingMessage}
              </Text>
              <TouchableOpacity
                onPress={dismiss}
                style={{ marginTop: spacing.xl, backgroundColor: festival ? accent : colors.primary, paddingHorizontal: spacing.xxl, paddingVertical: spacing.sm + 2, borderRadius: radius.md, alignSelf: 'stretch' }}
              >
                <Text style={{ color: 'white', textAlign: 'center', fontFamily: 'NotoSansOriya-Bold', ...typography.bodyEmphasis }}>
                  ଠିକ୍ ଅଛି
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Reanimated.View>
      </View>
    </Modal>
  );
}
