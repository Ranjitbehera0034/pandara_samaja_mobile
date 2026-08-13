// src/components/explore/NewsViewer.tsx
// Full-screen, swipeable, Inshorts-style reader — swiping left/right moves
// between articles instead of backing out to the list each time.
import React, { useRef } from 'react';
import { View, Text, Modal, FlatList, TouchableOpacity, ScrollView, Dimensions, Alert, Linking } from 'react-native';
import { Image } from 'expo-image';
import { X, ExternalLink } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NewsItem } from '../../api/news';
import { timeAgoShort } from '../../utils/feedUtils';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  visible: boolean;
  items: NewsItem[];
  initialIndex: number;
  onClose: () => void;
}

export default function NewsViewer({ visible, items, initialIndex, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography } = useTheme();
  const { t } = useLanguage();
  const listRef = useRef<FlatList>(null);

  const openFullArticle = (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(url).catch(() => {
      Alert.alert(t('common', 'errorTitle'), t('common', 'linkOpenError'));
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
          initialScrollIndex={initialIndex}
          renderItem={({ item }) => (
            <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.75, backgroundColor: C.card }}
                    contentFit="cover"
                  />
                ) : (
                  <View style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.5, backgroundColor: C.card }} />
                )}

                <View style={{ padding: spacing.xl }}>
                  <Text style={{ color: C.text, fontFamily: 'NotoSansOriya-Bold', marginBottom: spacing.sm, ...typography.title }}>
                    {item.title}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg }}>
                    <Text style={{ color: C.primaryLight, ...typography.caption, fontWeight: '700' }}>
                      {item.sourceName}
                    </Text>
                    {!!item.publishedAt && (
                      <Text style={{ color: C.textFaint, ...typography.caption }}>
                        · {timeAgoShort(item.publishedAt)}
                      </Text>
                    )}
                  </View>
                  <Text style={{ color: C.textMuted, fontFamily: 'NotoSansOriya', ...typography.body }}>
                    {item.snippet}
                  </Text>

                  <TouchableOpacity
                    onPress={() => openFullArticle(item.link)}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xxl, borderColor: C.border, borderWidth: 1, borderRadius: radius.md, paddingVertical: spacing.md }}
                  >
                    <Text style={{ color: C.primaryLight, ...typography.bodyEmphasis, fontWeight: '600' }}>
                      {t('explore', 'readFullArticle')}
                    </Text>
                    <ExternalLink size={16} color={C.primaryLight} />
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          )}
        />

        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClose(); }}
          style={{ position: 'absolute', top: insets.top + spacing.sm, right: spacing.lg, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
