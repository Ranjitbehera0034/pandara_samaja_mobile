// src/components/common/GlobalSearch.tsx
import React, { useState, useEffect } from 'react';
import {
  View, TextInput, Text, TouchableOpacity,
  ActivityIndicator, ScrollView, StyleSheet
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Search, Hash, User, MessageSquare, X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function GlobalSearch() {
  const navigation = useNavigation<any>();
  const { colors, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontFamily = lang === 'od' ? 'NotoSansOriya' : undefined;
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(() => {
      setIsSearching(false);
    }, 500); // UI delay mockup
    return () => clearTimeout(timer);
  }, [query]);

  // Mock results matching the web version exactly
  const results = [
    { type: 'member', id: 'MEM101', name: 'Sasmita Das', match: 'Software Engineer', icon: <User size={16} color="#60a5fa" /> },
    { type: 'hashtag', id: 'culture', name: '#CultureFest', match: '34 posts', icon: <Hash size={16} color="#c084fc" /> },
    { type: 'post', id: '12', name: 'Annual Meetup Details', match: 'Posted by Admin', icon: <MessageSquare size={16} color="#4ade80" /> },
  ];

  const handleSelect = (item: any) => {
    setIsOpen(false);
    setQuery('');
    if (item.type === 'member') {
      navigation.navigate('MemberProfile', { id: item.id });
    } else if (item.type === 'hashtag') {
      navigation.navigate('ExploreMain', { tag: item.id });
    } else if (item.type === 'post') {
      navigation.navigate('FeedMain');
    }
  };

  return (
    <View style={{ marginBottom: spacing.lg }} className="z-50 relative w-full">
      {/* Search Input Container */}
      <View
        style={{ backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, gap: spacing.sm }}
        className="relative flex-row items-center border"
      >
        <Search size={16} color={colors.textMuted} />
        <TextInput
          style={{ color: colors.text, fontFamily, paddingVertical: spacing.sm + 2, ...typography.body }}
          className="flex-1"
          placeholder={t('common', 'globalSearchPlaceholder')}
          placeholderTextColor={colors.textFaint}
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query ? (
          <TouchableOpacity onPress={() => { setQuery(''); setIsOpen(false); }}>
            <X size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Floating Dropdown Result Area */}
      {isOpen && query.trim() ? (
        <View
          style={{ backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md, ...shadow.raised }}
          className="absolute top-12 left-0 right-0 border overflow-hidden z-50"
        >
          {isSearching ? (
            <View style={{ padding: spacing.xl, gap: spacing.sm }} className="flex-row items-center justify-center">
              <ActivityIndicator size="small" color={colors.primaryLight} />
              <Text style={{ color: colors.textMuted, fontFamily, ...typography.body }}>{t('common', 'searching')}</Text>
            </View>
          ) : (
            <ScrollView className="max-h-60" keyboardShouldPersistTaps="handled">
              <View
                style={{ backgroundColor: colors.bg + '66', borderBottomColor: colors.border + '80', paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
                className="flex-row justify-between items-center border-b"
              >
                <Text style={{ color: colors.textFaint, fontFamily, letterSpacing: 0.5, ...typography.caption }} className="uppercase">
                  {t('common', 'topResults')}
                </Text>
              </View>
              {results.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleSelect(item)}
                  style={{ borderBottomColor: colors.border + '4d', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}
                  className="flex-row items-center border-b last:border-0"
                >
                  <View
                    style={{ backgroundColor: colors.bg + '99', borderColor: colors.border, borderRadius: radius.full }}
                    className="w-8 h-8 border flex items-center justify-center shrink-0"
                  >
                    {item.icon}
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text style={{ color: colors.text, fontFamily, ...typography.bodyEmphasis }} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontFamily, marginTop: 2, ...typography.caption }} numberOfLines={1}>
                      {item.match}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      ) : null}
    </View>
  );
}
