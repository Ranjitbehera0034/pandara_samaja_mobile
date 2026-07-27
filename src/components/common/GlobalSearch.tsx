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
  const { colors } = useTheme();
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
    { type: 'member', id: 'MEM101', name: 'Sasmita Das', match: 'Software Engineer', icon: <User size={14} color="#60a5fa" /> },
    { type: 'hashtag', id: 'culture', name: '#CultureFest', match: '34 posts', icon: <Hash size={14} color="#c084fc" /> },
    { type: 'post', id: '12', name: 'Annual Meetup Details', match: 'Posted by Admin', icon: <MessageSquare size={14} color="#4ade80" /> },
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
    <View className="z-50 relative w-full mb-4">
      {/* Search Input Container */}
      <View
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
        className="relative flex-row items-center border rounded-xl px-3 gap-2"
      >
        <Search size={16} color={colors.textMuted} />
        <TextInput
          style={{ color: colors.text, fontFamily }}
          className="flex-1 text-sm py-2.5"
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
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="absolute top-12 left-0 right-0 border rounded-xl shadow-2xl overflow-hidden z-50"
        >
          {isSearching ? (
            <View className="flex-row items-center justify-center p-6 gap-2">
              <ActivityIndicator size="small" color={colors.primaryLight} />
              <Text style={{ color: colors.textMuted, fontFamily }} className="text-sm">{t('common', 'searching')}</Text>
            </View>
          ) : (
            <ScrollView className="max-h-60" keyboardShouldPersistTaps="handled">
              <View
                style={{ backgroundColor: colors.bg + '66', borderBottomColor: colors.border + '80' }}
                className="px-3 py-2 flex-row justify-between items-center border-b"
              >
                <Text style={{ color: colors.textFaint, fontFamily }} className="text-xs font-semibold uppercase tracking-wider">
                  {t('common', 'topResults')}
                </Text>
              </View>
              {results.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleSelect(item)}
                  style={{ borderBottomColor: colors.border + '4d' }}
                  className="flex-row items-center gap-3 px-4 py-3 border-b last:border-0"
                >
                  <View
                    style={{ backgroundColor: colors.bg + '99', borderColor: colors.border }}
                    className="w-8 h-8 rounded-full border flex items-center justify-center shrink-0"
                  >
                    {item.icon}
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text style={{ color: colors.text, fontFamily }} className="font-semibold text-sm" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontFamily }} className="text-xs mt-0.5" numberOfLines={1}>
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
