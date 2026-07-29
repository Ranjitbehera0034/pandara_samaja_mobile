// src/screens/admin/AdminExpensesScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Plus, Trash2, X as XIcon, TrendingUp, TrendingDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import { ExpenseEntry, ExpenseSummary } from '../../api/admin';
import EmptyState from '../../components/common/EmptyState';
import SkeletonBox from '../../components/common/SkeletonBox';
import Button from '../../components/common/Button';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const PAGE_SIZE = 30;
type TypeFilter = 'all' | 'income' | 'expense';

export default function AdminExpensesScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [filter, setFilter] = useState<TypeFilter>('all');
  const [entries, setEntries] = useState<ExpenseEntry[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>({ totalIncome: 0, totalExpense: 0, balance: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [migrationPending, setMigrationPending] = useState(false);
  const [removingId, setRemovingId] = useState<string | number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ExpenseEntry | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formDate, setFormDate] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchEntries = useCallback(async (pageNum: number, replace = false) => {
    try {
      const data = await adminApi.fetchAdminExpenses({ page: pageNum, limit: PAGE_SIZE, type: filter === 'all' ? undefined : filter });
      if (data.success) {
        setMigrationPending(!!data.migrationPending);
        setEntries(prev => replace ? data.expenses : [...prev, ...data.expenses]);
        setSummary(data.summary);
        setPage(data.page);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch (e) {
      console.error('[ADMIN_EXPENSES] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'expensesLoadError'));
    }
  }, [filter, t]);

  useEffect(() => {
    setLoading(true);
    fetchEntries(1, true).finally(() => setLoading(false));
  }, [fetchEntries]);

  const onRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fetchEntries(1, true).finally(() => setRefreshing(false));
  };

  const onEndReached = () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    fetchEntries(page + 1).finally(() => setLoadingMore(false));
  };

  const resetForm = () => {
    setEditing(null);
    setFormTitle('');
    setFormType('expense');
    setFormAmount('');
    setFormCategory('');
    setFormNote('');
    setFormDate('');
  };

  const openCreate = () => {
    resetForm();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowForm(true);
  };

  const openEdit = (item: ExpenseEntry) => {
    setEditing(item);
    setFormTitle(item.title);
    setFormType(item.type);
    setFormAmount(String(item.amount));
    setFormCategory(item.category || '');
    setFormNote(item.note || '');
    setFormDate(item.entry_date ? item.entry_date.slice(0, 10) : '');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      Alert.alert(t('common', 'errorTitle'), t('admin', 'expenseTitleRequiredError'));
      return;
    }
    if (!formAmount || isNaN(Number(formAmount))) {
      Alert.alert(t('common', 'errorTitle'), t('admin', 'expenseAmountRequiredError'));
      return;
    }
    setSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const payload = {
        title: formTitle.trim(),
        type: formType,
        amount: Number(formAmount),
        category: formCategory.trim() || undefined,
        note: formNote.trim() || undefined,
        entryDate: formDate.trim() || undefined,
      };
      const data = editing
        ? await adminApi.updateExpense(editing.id, payload)
        : await adminApi.createExpense(payload);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowForm(false);
        resetForm();
        fetchEntries(1, true);
      } else {
        throw new Error(data.message || t('admin', 'expenseSaveError'));
      }
    } catch (e: any) {
      console.error('[ADMIN_EXPENSES] Save failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'expenseSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const doRemove = async (id: string | number) => {
    setRemovingId(id);
    try {
      const data = await adminApi.deleteExpense(id);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        fetchEntries(1, true);
      } else {
        throw new Error(data.message || t('admin', 'expenseDeleteError'));
      }
    } catch (e: any) {
      console.error('[ADMIN_EXPENSES] Remove failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'expenseDeleteError'));
    } finally {
      setRemovingId(null);
    }
  };

  const handleRemove = (item: ExpenseEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      t('admin', 'confirmDeleteExpenseTitle'),
      t('admin', 'confirmDeleteExpenseMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        { text: t('common', 'delete'), style: 'destructive', onPress: () => doRemove(item.id) },
      ]
    );
  };

  const tabs: { key: TypeFilter; label: string }[] = [
    { key: 'all', label: t('admin', 'expenseFilterAll') },
    { key: 'income', label: t('admin', 'expenseFilterIncome') },
    { key: 'expense', label: t('admin', 'expenseFilterExpense') },
  ];

  const renderEntry = useCallback(({ item }: { item: ExpenseEntry }) => {
    const isIncome = item.type === 'income';
    return (
      <TouchableOpacity
        onPress={() => openEdit(item)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.card }}
      >
        <View style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: (isIncome ? C.success : C.error) + '15', alignItems: 'center', justifyContent: 'center' }}>
          {isIncome ? <TrendingUp size={16} color={C.success} /> : <TrendingDown size={16} color={C.error} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontFamily: fontBold, ...typography.bodyEmphasis }} numberOfLines={1}>{item.title}</Text>
          <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: 2, ...typography.caption }} numberOfLines={1}>
            {[item.category, item.entry_date ? new Date(item.entry_date).toLocaleDateString() : null].filter(Boolean).join(' · ') || '—'}
          </Text>
        </View>
        <Text style={{ color: isIncome ? C.success : C.error, fontFamily: fontBold, ...typography.bodyEmphasis }}>
          {isIncome ? '+' : '−'}₹{Number(item.amount).toLocaleString('en-IN')}
        </Text>
        <TouchableOpacity
          onPress={() => handleRemove(item)}
          disabled={removingId === item.id}
          style={{ width: 30, height: 30, borderRadius: radius.full, backgroundColor: C.error + '15', alignItems: 'center', justifyContent: 'center' }}
        >
          {removingId === item.id ? <ActivityIndicator size="small" color={C.error} /> : <Trash2 size={14} color={C.error} />}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, [C, spacing, radius, typography, shadow, fontBold, fontRegular, removingId]);

  const keyExtractor = useCallback((item: ExpenseEntry) => String(item.id), []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.heading }}>{t('admin', 'expensesTitle')}</Text>
        <TouchableOpacity
          onPress={openCreate}
          style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
          <View style={{ flex: 1, backgroundColor: C.success + '15', borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' }}>
            <Text style={{ color: C.success, ...typography.caption, fontWeight: '700' }}>{t('admin', 'summaryIncomeLabel')}</Text>
            <Text style={{ color: C.success, fontFamily: fontBold, marginTop: 2, ...typography.bodyEmphasis }}>₹{summary.totalIncome.toLocaleString('en-IN')}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: C.error + '15', borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' }}>
            <Text style={{ color: C.error, ...typography.caption, fontWeight: '700' }}>{t('admin', 'summaryExpenseLabel')}</Text>
            <Text style={{ color: C.error, fontFamily: fontBold, marginTop: 2, ...typography.bodyEmphasis }}>₹{summary.totalExpense.toLocaleString('en-IN')}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: C.primary + '15', borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' }}>
            <Text style={{ color: C.primary, ...typography.caption, fontWeight: '700' }}>{t('admin', 'summaryBalanceLabel')}</Text>
            <Text style={{ color: C.primary, fontFamily: fontBold, marginTop: 2, ...typography.bodyEmphasis }}>₹{summary.balance.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFilter(tab.key); }}
              style={{
                flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.md,
                borderWidth: 1, borderColor: filter === tab.key ? C.primary : C.border,
                backgroundColor: filter === tab.key ? C.primary + '15' : C.card,
              }}
            >
              <Text style={{ color: filter === tab.key ? C.primary : C.textMuted, fontFamily: fontBold, ...typography.caption, fontWeight: '700' }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
        {loading && entries.length === 0 ? (
          <View style={{ gap: spacing.md }}>
            {[1, 2, 3, 4].map(i => (
              <View key={i} style={{ flexDirection: 'row', gap: spacing.md, padding: spacing.lg, backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.border }}>
                <SkeletonBox width={36} height={36} borderRadius={18} />
                <View style={{ flex: 1, gap: spacing.sm, justifyContent: 'center' }}>
                  <SkeletonBox width="60%" height={14} />
                  <SkeletonBox width="40%" height={11} />
                </View>
              </View>
            ))}
          </View>
        ) : migrationPending ? (
          <EmptyState emoji="🛠️" title={t('admin', 'expensesMigrationPendingTitle')} subtitle={t('admin', 'expensesMigrationPendingSubtitle')} />
        ) : (
          <FlashList
            data={entries}
            keyExtractor={keyExtractor}
            renderItem={renderEntry}
            ListEmptyComponent={
              <EmptyState emoji="💰" title={t('admin', 'expensesEmptyTitle')} subtitle={t('admin', 'expensesEmptySubtitle')} />
            }
            ListFooterComponent={
              <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
                {loadingMore && <ActivityIndicator size="small" color={C.primaryLight} />}
              </View>
            }
            onEndReached={onEndReached}
            onEndReachedThreshold={0.3}
            contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} progressBackgroundColor={C.card} />
            }
          />
        )}
      </View>

      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View style={{ backgroundColor: C.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: insets.bottom + spacing.xl, maxHeight: '88%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
              <Text style={{ color: C.text, fontFamily: fontBold, ...typography.title }}>
                {editing ? t('admin', 'editExpenseTitle') : t('admin', 'newExpenseTitle')}
              </Text>
              <TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }}>
                <XIcon size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
                {(['income', 'expense'] as const).map(ty => (
                  <TouchableOpacity
                    key={ty}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFormType(ty); }}
                    style={{
                      flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.md,
                      borderWidth: 1, borderColor: formType === ty ? C.primary : C.border,
                      backgroundColor: formType === ty ? C.primary + '15' : C.card,
                    }}
                  >
                    <Text style={{ color: formType === ty ? C.primary : C.textMuted, ...typography.body, fontWeight: '700' }}>
                      {ty === 'income' ? t('admin', 'expenseFilterIncome') : t('admin', 'expenseFilterExpense')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('admin', 'expenseTitleLabel')}</Text>
              <TextInput
                style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, fontFamily: fontRegular, ...typography.body }}
                placeholder={t('admin', 'expenseTitlePlaceholder')}
                placeholderTextColor={C.textFaint}
                value={formTitle}
                onChangeText={setFormTitle}
              />

              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('admin', 'expenseAmountLabel')}</Text>
              <TextInput
                style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, ...typography.body }}
                placeholder={t('admin', 'expenseAmountPlaceholder')}
                placeholderTextColor={C.textFaint}
                value={formAmount}
                onChangeText={setFormAmount}
                keyboardType="numeric"
              />

              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('admin', 'expenseCategoryLabel')}</Text>
              <TextInput
                style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, fontFamily: fontRegular, ...typography.body }}
                placeholder={t('admin', 'expenseCategoryPlaceholder')}
                placeholderTextColor={C.textFaint}
                value={formCategory}
                onChangeText={setFormCategory}
              />

              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('admin', 'expenseDateLabel')}</Text>
              <TextInput
                style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, ...typography.body }}
                placeholder={t('admin', 'expenseDatePlaceholder')}
                placeholderTextColor={C.textFaint}
                value={formDate}
                onChangeText={setFormDate}
                autoCapitalize="none"
              />

              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('admin', 'expenseNoteLabel')}</Text>
              <TextInput
                style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, fontFamily: fontRegular, minHeight: 70, textAlignVertical: 'top', ...typography.body }}
                placeholder={t('admin', 'expenseNotePlaceholder')}
                placeholderTextColor={C.textFaint}
                value={formNote}
                onChangeText={setFormNote}
                multiline
              />

              <Button variant="primary" label={t('common', 'save')} onPress={handleSave} loading={saving} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
