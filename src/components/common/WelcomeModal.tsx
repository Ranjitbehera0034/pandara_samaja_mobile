// src/components/common/WelcomeModal.tsx
// Always in Odia regardless of the member's selected app language —
// a deliberate community-culture choice, not driven by LanguageContext.
// On a festival day (see theme/occasions.ts), greets with that occasion's
// message instead of the generic welcome, with a small celebratory
// sparkle animation — otherwise a plain spring-in card, no sparkles.
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay,
  withRepeat, withSequence, Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getActiveOccasion } from '../../theme/occasions';

function Sparkle({ color, style, delay }: { color: string; style: any; delay: number }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }),
        withTiming(0.3, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ),
      -1, true
    ));
    scale.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(1, { duration: 500 }),
        withTiming(0.6, { duration: 700 })
      ),
      -1, true
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  return <Reanimated.Text style={[style, animStyle, { color, fontSize: 18 }]}>✦</Reanimated.Text>;
}

export default function WelcomeModal() {
  const { colors, spacing, radius, typography, shadow } = useTheme();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const occasion = getActiveOccasion();

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
  const greetingTitle = occasion ? occasion.greetingTitle : 'ଜୟ ଜଗନ୍ନାଥ';
  const greetingMessage = occasion
    ? occasion.greetingMessage.replace('{name}', namePrefix)
    : `${namePrefix}ପନ୍ଦରା ସମାଜ ଆପ୍‌ରେ ଆପଣଙ୍କୁ ହାର୍ଦ୍ଦିକ ସ୍ୱାଗତ। ଆମ ସମାଜର ସୂଚନା, ଘଟଣା ଏବଂ ସଦସ୍ୟଙ୍କ ସହ ସଂଯୋଗରେ ରୁହନ୍ତୁ।`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
        <Reanimated.View style={[{ width: '100%', maxWidth: 360 }, cardStyle]}>
          <View style={{
            backgroundColor: colors.card,
            borderRadius: radius.xl,
            padding: spacing.xl,
            alignItems: 'center',
            overflow: 'hidden',
            ...shadow.card,
          }}>
            {occasion && (
              <LinearGradient
                colors={[occasion.accentColor + '20', 'transparent']}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120 }}
              />
            )}

            {occasion && (
              <>
                <Sparkle color={occasion.ringColors[0]} style={{ position: 'absolute', top: 22, left: 36 }} delay={0} />
                <Sparkle color={occasion.ringColors[2]} style={{ position: 'absolute', top: 40, right: 40 }} delay={300} />
                <Sparkle color={occasion.ringColors[1]} style={{ position: 'absolute', top: 16, right: 90 }} delay={600} />
              </>
            )}

            <Reanimated.View style={iconStyle}>
              {occasion ? (
                <LinearGradient
                  colors={occasion.ringColors}
                  style={{ width: 76, height: 76, borderRadius: 38, padding: 3, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }}
                >
                  <View style={{ width: '100%', height: '100%', borderRadius: 35, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 34 }} numberOfLines={1} adjustsFontSizeToFit>{occasion.emoji}</Text>
                  </View>
                </LinearGradient>
              ) : (
                <Text style={{ fontSize: 40, marginBottom: spacing.md }}>🙏</Text>
              )}
            </Reanimated.View>

            <Text style={{ color: occasion?.accentColor || colors.text, fontFamily: 'NotoSansOriya-Bold', textAlign: 'center', marginBottom: spacing.sm, ...typography.title }}>
              {greetingTitle}
            </Text>
            <Text style={{ color: colors.textMuted, fontFamily: 'NotoSansOriya', textAlign: 'center', ...typography.body }}>
              {greetingMessage}
            </Text>
            <TouchableOpacity
              onPress={dismiss}
              style={{ marginTop: spacing.xl, backgroundColor: occasion?.accentColor || colors.primary, paddingHorizontal: spacing.xxl, paddingVertical: spacing.sm + 2, borderRadius: radius.md, alignSelf: 'stretch' }}
            >
              <Text style={{ color: 'white', textAlign: 'center', fontFamily: 'NotoSansOriya-Bold', ...typography.bodyEmphasis }}>
                ଠିକ୍ ଅଛି
              </Text>
            </TouchableOpacity>
          </View>
        </Reanimated.View>
      </View>
    </Modal>
  );
}
