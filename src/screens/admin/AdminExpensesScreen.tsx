// src/screens/admin/AdminExpensesScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, Linking,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Plus, Trash2, X as XIcon, Wallet, Paperclip } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import { ExpenseEntry } from '../../api/admin';
import EmptyState from '../../components/common/EmptyState';
import SkeletonBox from '../../components/common/SkeletonBox';
import Button from '../../components/common/Button';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const PAGE_SIZE = 30;

export default function AdminExpensesScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [entries, setEntries] = useState<ExpenseEntry[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ExpenseEntry | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPayee, setFormPayee] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState('');
  const [existingAttachmentUrl, setExistingAttachmentUrl] = useState<string | null>(null);
  const [newAttachment, setNewAttachment] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchEntries = useCallback(async (pageNum: number, replace = false) => {
    try {
      const data = await adminApi.fetchAdminExpenses({ page: pageNum, limit: PAGE_SIZE, category: categoryFilter || undefined });
      if (data.success) {
        setEntries(prev => replace ? data.expenses : [...prev, ...data.expenses]);
        setTotalSpent(data.totalSpent ?? 0);
        setCategories(data.categories ?? []);
        setPage(data.page);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch (e) {
      console.error('[ADMIN_EXPENSES] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'expensesLoadError'));
    }
  }, [categoryFilter, t]);

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
    setFormAmount('');
    setFormCategory('');
    setFormPayee('');
    setFormDescription('');
    setFormDate('');
    setExistingAttachmentUrl(null);
    setNewAttachment(null);
  };

  const pickAttachment = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('common', 'errorTitle'), t('admin', 'expenseAttachmentPermissionError'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const name = asset.fileName || `receipt_${Date.now()}.jpg`;
      setNewAttachment({ uri: asset.uri, name, type: asset.mimeType || 'image/jpeg' });
    }
  };

  const openCreate = () => {
    resetForm();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowForm(true);
  };

  const openEdit = (item: ExpenseEntry) => {
    setEditing(item);
    setFormTitle(item.title);
    setFormAmount(String(item.amount));
    setFormCategory(item.category || '');
    setFormPayee(item.payee || '');
    setFormDescription(item.description || '');
    setFormDate(item.expense_date ? item.expense_date.slice(0, 10) : '');
    setExistingAttachmentUrl(item.attachment_url || null);
    setNewAttachment(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      Alert.alert(t('common', 'errorTitle'), t('admin', 'expenseTitleRequiredError'));
      return;
    }
    if (!formCategory.trim()) {
      Alert.alert(t('common', 'errorTitle'), t('admin', 'expenseCategoryRequiredError'));
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
        category: formCategory.trim(),
        amount: Number(formAmount),
        payee: formPayee.trim() || undefined,
        description: formDescription.trim() || undefined,
        expenseDate: formDate.trim() || undefined,
        attachment: newAttachment || undefined,
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

  const renderEntry = useCallback(({ item }: { item: ExpenseEntry }) => (
    <TouchableOpacity
      onPress={() => openEdit(item)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.card }}
    >
      <View style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: C.error + '15', alignItems: 'center', justifyContent: 'center' }}>
        <Wallet size={16} color={C.error} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontFamily: fontBold, ...typography.bodyEmphasis }} numberOfLines={1}>{item.title}</Text>
        <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: 2, ...typography.caption }} numberOfLines={1}>
          {[item.category, item.payee, item.expense_date ? new Date(item.expense_date).toLocaleDateString() : null].filter(Boolean).join(' · ') || '—'}
        </Text>
      </View>
      {item.attachment_url ? (
        <TouchableOpacity onPress={() => Linking.openURL(item.attachment_url!)} style={{ padding: spacing.xs }}>
          <Paperclip size={16} color={C.textMuted} />
        </TouchableOpacity>
      ) : null}
      <Text style={{ color: C.error, fontFamily: fontBold, ...typography.bodyEmphasis }}>
        ₹{Number(item.amount).toLocaleString('en-IN')}
      </Text>
      <TouchableOpacity
        onPress={() => handleRemove(item)}
        disabled={removingId === item.id}
        style={{ width: 30, height: 30, borderRadius: radius.full, backgroundColor: C.error + '15', alignItems: 'center', justifyContent: 'center' }}
      >
        {removingId === item.id ? <ActivityIndicator size="small" color={C.error} /> : <Trash2 size={14} color={C.error} />}
      </TouchableOpacity>
    </TouchableOpacity>
  ), [C, spacing, radius, typography, shadow, fontBold, fontRegular, removingId]);

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
        <View style={{ backgroundColor: C.error + '15', borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.md }}>
          <Text style={{ color: C.error, ...typography.caption, fontWeight: '700' }}>{t('admin', 'summaryTotalSpentLabel')}</Text>
          <Text style={{ color: C.error, fontFamily: fontBold, marginTop: 2, ...typography.title }}>₹{totalSpent.toLocaleString('en-IN')}</Text>
        </View>

        {categories.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCategoryFilter(''); }}
              style={{
                paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full,
                borderWidth: 1, borderColor: !categoryFilter ? C.primary : C.border,
                backgroundColor: !categoryFilter ? C.primary + '15' : C.card,
              }}
            >
              <Text style={{ color: !categoryFilter ? C.primary : C.textMuted, ...typography.caption, fontWeight: '700' }}>{t('admin', 'expenseFilterAll')}</Text>
            </TouchableOpacity>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCategoryFilter(cat); }}
                style={{
                  paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full,
                  borderWidth: 1, borderColor: categoryFilter === cat ? C.primary : C.border,
                  backgroundColor: categoryFilter === cat ? C.primary + '15' : C.card,
                }}
              >
                <Text style={{ color: categoryFilter === cat ? C.primary : C.textMuted, ...typography.caption, fontWeight: '700' }}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
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
        ) : (
          <FlashList
            maintainVisibleContentPosition={{ disabled: true }}
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

              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('admin', 'expensePayeeLabel')}</Text>
              <TextInput
                style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, fontFamily: fontRegular, ...typography.body }}
                placeholder={t('admin', 'expensePayeePlaceholder')}
                placeholderTextColor={C.textFaint}
                value={formPayee}
                onChangeText={setFormPayee}
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

              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('admin', 'expenseDescriptionLabel')}</Text>
              <TextInput
                style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, fontFamily: fontRegular, minHeight: 70, textAlignVertical: 'top', ...typography.body }}
                placeholder={t('admin', 'expenseDescriptionPlaceholder')}
                placeholderTextColor={C.textFaint}
                value={formDescription}
                onChangeText={setFormDescription}
                multiline
              />

              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('admin', 'expenseAttachmentLabel')}</Text>
              <TouchableOpacity
                onPress={pickAttachment}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderStyle: 'dashed',
                  borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg,
                  backgroundColor: C.card, borderColor: C.border,
                }}
              >
                <Paperclip size={16} color={C.textMuted} />
                <Text style={{ color: C.textMuted, fontFamily: fontRegular, flex: 1, ...typography.body }} numberOfLines={1}>
                  {newAttachment
                    ? newAttachment.name
                    : existingAttachmentUrl
                      ? t('admin', 'expenseAttachmentReplace')
                      : t('admin', 'expenseAttachmentPlaceholder')}
                </Text>
                {existingAttachmentUrl && !newAttachment ? (
                  <TouchableOpacity onPress={() => Linking.openURL(existingAttachmentUrl)}>
                    <Text style={{ color: C.primaryLight, ...typography.caption, fontWeight: '700' }}>{t('admin', 'expenseAttachmentView')}</Text>
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>

              <Button variant="primary" label={t('common', 'save')} onPress={handleSave} loading={saving} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
