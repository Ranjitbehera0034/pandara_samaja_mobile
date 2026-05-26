// src/screens/members/MembersScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, SafeAreaView
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { Search, Filter, X, Users, RefreshCw } from 'lucide-react-native';
import { Member } from '../../types';
import * as membersApi from '../../api/members';
import { useDebounce } from '../../hooks/useDebounce';
import MemberCard from '../../components/members/MemberCard';
import FilterModal from '../../components/members/FilterModal';

const PAGE_SIZE = 30;

interface FilterState {
  district: string;
  taluka: string;
  panchayat: string;
  gender: string;
}

export default function MembersScreen() {
  const navigation = useNavigation<any>();

  // Search + filter state
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [filters, setFilters] = useState<FilterState>({ district: '', taluka: '', panchayat: '', gender: '' });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterOptions, setFilterOptions] = useState({ districts: [], talukas: {}, panchayats: {} });

  // Data state
  const [members, setMembers] = useState<Member[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // Load filter options once
  useEffect(() => {
    membersApi.fetchMemberFilters()
      .then(d => { if (d.success) setFilterOptions(d.filters || {}); })
      .catch(() => {});
  }, []);

  // Core fetch — replace=true resets list, replace=false appends
  const fetchMembers = useCallback(async (pageNum: number, replace = false) => {
    try {
      const data = await membersApi.fetchMembers({
        page: pageNum,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        district: filters.district || undefined,
        taluka: filters.taluka || undefined,
        panchayat: filters.panchayat || undefined,
        gender: filters.gender || undefined,
      });

      if (data.success) {
        setMembers(prev => replace ? data.members : [...prev, ...data.members]);
        setPage(data.page);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch (e) {
      console.error('[MEMBERS] Fetch failed:', e);
      Alert.alert('Error', 'Failed to load members');
    }
  }, [debouncedSearch, filters]);

  // Reload on search/filter change
  useEffect(() => {
    setLoading(true);
    fetchMembers(1, true).finally(() => setLoading(false));
  }, [fetchMembers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMembers(1, true).finally(() => setRefreshing(false));
  };

  const onEndReached = () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    fetchMembers(page + 1).finally(() => setLoadingMore(false));
  };

  const handleSubscribe = async (memberId: string) => {
    setSubscribing(memberId);
    try {
      const data = await membersApi.toggleSubscribe(memberId);
      if (data.success) {
        setMembers(prev => prev.map(m =>
          m.membership_no === memberId ? { ...m, is_subscribed: data.subscribed } : m
        ));
      }
    } catch (e) {
      console.error('[SUBSCRIBE] Toggle failed:', e);
    } finally {
      setSubscribing(null);
    }
  };

  const ListHeader = () => (
    <View className="pt-4 pb-2">
      {/* Title */}
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-white text-2xl font-bold">Members</Text>
          <Text className="text-slate-400 text-sm">
            {members.length} / {total.toLocaleString()} members
            {debouncedSearch ? ` matching "${debouncedSearch}"` : ''}
          </Text>
        </View>
        {loading && members.length > 0 && (
          <ActivityIndicator size="small" color="#3b82f6" />
        )}
      </View>

      {/* Search bar */}
      <View className="flex-row gap-2 mb-3">
        <View className="flex-1 flex-row items-center bg-slate-800 border border-slate-700 rounded-xl px-3 gap-2">
          <Search size={15} color="#94a3b8" />
          <TextInput
            className="flex-1 text-white text-sm py-2.5"
            placeholder="Name · #no · village · mobile…"
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={14} color="#64748b" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter button */}
        <TouchableOpacity
          onPress={() => setShowFilterModal(true)}
          className={`px-3 py-2 rounded-xl border items-center justify-center ${activeFilterCount > 0
            ? 'bg-blue-600 border-blue-600'
            : 'bg-slate-800 border-slate-700'
          }`}
        >
          <Filter size={16} color={activeFilterCount > 0 ? 'white' : '#94a3b8'} />
          {activeFilterCount > 0 && (
            <View className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 items-center justify-center">
              <Text className="text-white text-xs font-bold">{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Refresh */}
        <TouchableOpacity
          onPress={onRefresh}
          className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 items-center justify-center"
        >
          <RefreshCw size={15} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <View className="flex-row flex-wrap gap-2 mb-3">
          {filters.district ? (
            <View className="flex-row items-center gap-1 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full">
              <Text className="text-blue-400 text-xs font-medium">{filters.district}</Text>
              <TouchableOpacity onPress={() => setFilters(f => ({ ...f, district: '', taluka: '', panchayat: '' }))}>
                <X size={12} color="#3b82f6" />
              </TouchableOpacity>
            </View>
          ) : null}
          {filters.taluka ? (
            <View className="flex-row items-center gap-1 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full">
              <Text className="text-blue-400 text-xs font-medium">{filters.taluka}</Text>
              <TouchableOpacity onPress={() => setFilters(f => ({ ...f, taluka: '', panchayat: '' }))}>
                <X size={12} color="#3b82f6" />
              </TouchableOpacity>
            </View>
          ) : null}
          {filters.panchayat ? (
            <View className="flex-row items-center gap-1 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full">
              <Text className="text-blue-400 text-xs font-medium">{filters.panchayat}</Text>
              <TouchableOpacity onPress={() => setFilters(f => ({ ...f, panchayat: '' }))}>
                <X size={12} color="#3b82f6" />
              </TouchableOpacity>
            </View>
          ) : null}
          {filters.gender ? (
            <View className="flex-row items-center gap-1 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full">
              <Text className="text-blue-400 text-xs font-medium">{filters.gender === 'male' ? '♂ Male HoF' : '♀ Female HoF'}</Text>
              <TouchableOpacity onPress={() => setFilters(f => ({ ...f, gender: '' }))}>
                <X size={12} color="#3b82f6" />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );

  if (loading && members.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-slate-400 text-sm mt-3">Loading members…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="flex-1 px-4">
        <FlashList
          data={members}
          keyExtractor={item => item.membership_no}
          renderItem={({ item }) => (
            <MemberCard
              member={item as any}
              onPress={() => navigation.navigate('MemberProfile', { id: item.membership_no })}
              onSubscribe={() => handleSubscribe(item.membership_no)}
              onMessage={() => navigation.navigate('Chat', { withId: item.membership_no, withName: item.name })}
              subscribing={subscribing === item.membership_no}
            />
          )}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <View className="items-center py-20 bg-slate-800/30 rounded-2xl border border-slate-700/50 px-6">
              <Users size={40} color="#475569" className="mb-4" />
              <Text className="text-slate-300 text-lg font-medium text-center">No members found</Text>
              <Text className="text-slate-500 text-sm text-center mt-1">Try adjusting your search or filters</Text>
            </View>
          }
          ListFooterComponent={
            <View className="py-4 items-center">
              {loadingMore && <ActivityIndicator size="small" color="#3b82f6" />}
              {!loadingMore && page >= totalPages && members.length > 0 && (
                <Text className="text-slate-600 text-xs">All {total.toLocaleString()} members loaded</Text>
              )}
            </View>
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
          }
        />
      </View>

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        options={filterOptions as any}
        filters={filters}
        onChange={setFilters}
        totalResults={total}
      />
    </SafeAreaView>
  );
}
