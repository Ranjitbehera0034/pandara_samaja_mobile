// src/components/common/GlobalSearch.tsx
import React, { useState, useEffect } from 'react';
import {
  View, TextInput, Text, TouchableOpacity,
  ActivityIndicator, ScrollView, StyleSheet
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Search, Hash, User, MessageSquare, X } from 'lucide-react-native';

export default function GlobalSearch() {
  const navigation = useNavigation<any>();
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
      <View className="relative flex-row items-center bg-slate-800 border border-slate-700 rounded-xl px-3 gap-2">
        <Search size={16} color="#94a3b8" />
        <TextInput
          className="flex-1 text-white text-sm py-2.5"
          placeholder="Search members, posts, tags…"
          placeholderTextColor="#64748b"
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
            <X size={16} color="#94a3b8" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Floating Dropdown Result Area */}
      {isOpen && query.trim() ? (
        <View className="absolute top-12 left-0 right-0 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
          {isSearching ? (
            <View className="flex-row items-center justify-center p-6 gap-2">
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text className="text-slate-400 text-sm">Searching…</Text>
            </View>
          ) : (
            <ScrollView className="max-h-60" keyboardShouldPersistTaps="handled">
              <View className="px-3 py-2 bg-slate-900/40 flex-row justify-between items-center border-b border-slate-700/50">
                <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Top Results</Text>
              </View>
              {results.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleSelect(item)}
                  className="flex-row items-center gap-3 px-4 py-3 border-b border-slate-700/30 last:border-0"
                >
                  <View className="w-8 h-8 rounded-full bg-slate-950/60 border border-slate-700 flex items-center justify-center shrink-0">
                    {item.icon}
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="font-semibold text-sm text-white" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text className="text-slate-400 text-xs mt-0.5" numberOfLines={1}>
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
