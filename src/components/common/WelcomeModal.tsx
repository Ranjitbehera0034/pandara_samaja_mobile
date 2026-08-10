// src/components/common/WelcomeModal.tsx
// Always in Odia regardless of the member's selected app language —
// a deliberate community-culture choice, not driven by LanguageContext.
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export default function WelcomeModal() {
  const { colors, spacing, radius, typography, shadow } = useTheme();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  // Fires once per mount — RootNavigator only mounts this alongside
  // MainTabs when isAuthenticated flips true, so this naturally shows
  // once per login (including a cold start into an already-valid session).
  useEffect(() => {
    setVisible(true);
  }, []);

  const dismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVisible(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
        <View style={{
          width: '100%',
          maxWidth: 360,
          backgroundColor: colors.card,
          borderRadius: radius.xl,
          padding: spacing.xl,
          alignItems: 'center',
          ...shadow.card,
        }}>
          <Text style={{ fontSize: 40, marginBottom: spacing.md }}>🙏</Text>
          <Text style={{ color: colors.text, fontFamily: 'NotoSansOriya-Bold', textAlign: 'center', marginBottom: spacing.sm, ...typography.title }}>
            ଜୟ ଜଗନ୍ନାଥ
          </Text>
          <Text style={{ color: colors.textMuted, fontFamily: 'NotoSansOriya', textAlign: 'center', ...typography.body }}>
            {user?.name ? `${user.name}, ` : ''}ପନ୍ଦରା ସମାଜ ଆପ୍‌ରେ ଆପଣଙ୍କୁ ହାର୍ଦ୍ଦିକ ସ୍ୱାଗତ। ଆମ ସମାଜର ସୂଚନା, ଘଟଣା ଏବଂ ସଦସ୍ୟଙ୍କ ସହ ସଂଯୋଗରେ ରୁହନ୍ତୁ।
          </Text>
          <TouchableOpacity
            onPress={dismiss}
            style={{ marginTop: spacing.xl, backgroundColor: colors.primary, paddingHorizontal: spacing.xxl, paddingVertical: spacing.sm + 2, borderRadius: radius.md, alignSelf: 'stretch' }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontFamily: 'NotoSansOriya-Bold', ...typography.bodyEmphasis }}>
              ଠିକ୍ ଅଛି
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
