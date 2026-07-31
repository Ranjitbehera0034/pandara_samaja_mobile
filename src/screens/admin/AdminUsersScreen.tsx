// src/screens/admin/AdminUsersScreen.tsx — superadmin only (entry point is
// hidden on AdminDashboard for role 'admin'; screen itself is inert if the
// backend rejects a non-superadmin token, since every /admin/users call
// is gated server-side too).
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Plus, Trash2, X as XIcon, Edit2, Ban, CheckCircle2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import { AdminAccountRow } from '../../api/admin';
import { useAdminAuth } from '../../context/AdminAuthContext';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function AdminUsersScreen() {
  const navigation = useNavigation<any>();
  const { adminUser } = useAdminAuth();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [users, setUsers] = useState<AdminAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | number | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'superadmin'>('admin');
  const [creating, setCreating] = useState(false);

  const [editingUser, setEditingUser] = useState<AdminAccountRow | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'superadmin'>('admin');
  const [editPassword, setEditPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | number | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await adminApi.fetchAdminAccounts();
      if (data.success) setUsers(data.users);
    } catch (e) {
      console.error('[ADMIN_USERS] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'usersLoadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const resetCreateForm = () => {
    setNewUsername('');
    setNewPassword('');
    setNewEmail('');
    setNewRole('admin');
  };

  const handleCreate = async () => {
    if (!newUsername.trim()) {
      Alert.alert(t('common', 'errorTitle'), t('admin', 'usernameRequiredCreateError'));
      return;
    }
    if (!newPassword) {
      Alert.alert(t('common', 'errorTitle'), t('admin', 'passwordRequiredCreateError'));
      return;
    }
    setCreating(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const data = await adminApi.createAdminAccount(newUsername.trim(), newPassword, newRole, newEmail.trim());
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowCreate(false);
        resetCreateForm();
        load();
      } else {
        throw new Error(data.message || t('admin', 'createAdminError'));
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'createAdminError'));
    } finally {
      setCreating(false);
    }
  };

  const doRemove = async (id: string | number) => {
    setRemovingId(id);
    try {
      const data = await adminApi.deleteAdminAccount(id);
      if (data.success) {
        setUsers(prev => prev.filter(u => u.id !== id));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(data.message || t('admin', 'removeError'));
      }
    } catch (e: any) {
      console.error('[ADMIN_USERS] Remove failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'removeError'));
    } finally {
      setRemovingId(null);
    }
  };

  const handleRemove = (row: AdminAccountRow) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      t('admin', 'confirmRemoveTitle'),
      t('admin', 'confirmRemoveMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        { text: t('admin', 'removeButton'), style: 'destructive', onPress: () => doRemove(row.id) },
      ]
    );
  };

  const openEdit = (row: AdminAccountRow) => {
    setEditingUser(row);
    setEditUsername(row.username);
    setEditRole(row.role);
    setEditPassword('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    if (!editUsername.trim()) {
      Alert.alert(t('common', 'errorTitle'), t('admin', 'usernameRequiredCreateError'));
      return;
    }
    setSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const data = await adminApi.updateAdminAccount(editingUser.id, {
        username: editUsername.trim(),
        role: editRole,
        password: editPassword || undefined,
      });
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setEditingUser(null);
        load();
      } else {
        throw new Error(data.message || t('admin', 'editAdminError'));
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.response?.data?.message || e.message || t('admin', 'editAdminError'));
    } finally {
      setSaving(false);
    }
  };

  const doToggleActive = async (row: AdminAccountRow) => {
    const nextActive = row.is_active === false;
    setTogglingId(row.id);
    try {
      const data = await adminApi.setAdminAccountActive(row.id, nextActive);
      if (data.success) {
        setUsers(prev => prev.map(u => u.id === row.id ? { ...u, is_active: nextActive } : u));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(data.message || t('admin', 'adminStatusError'));
      }
    } catch (e: any) {
      console.error('[ADMIN_USERS] Toggle active failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.response?.data?.message || e.message || t('admin', 'adminStatusError'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleActive = (row: AdminAccountRow) => {
    const isBanned = row.is_active === false;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      isBanned ? t('admin', 'confirmUnbanAdminTitle') : t('admin', 'confirmBanAdminTitle'),
      isBanned ? t('admin', 'confirmUnbanAdminMessage') : t('admin', 'confirmBanAdminMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        { text: isBanned ? t('admin', 'unbanButton') : t('admin', 'banButton'), style: 'destructive', onPress: () => doToggleActive(row) },
      ]
    );
  };

  const renderUser = useCallback(({ item }: { item: AdminAccountRow }) => {
    const isSelf = adminUser && String(adminUser.id) === String(item.id);
    const isBanned = item.is_active === false;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.card }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontFamily: fontBold, ...typography.bodyEmphasis }}>{item.username}</Text>
          <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: 2, ...typography.caption }}>
            {item.role === 'superadmin' ? t('admin', 'roleSuperadmin') : t('admin', 'roleAdmin')}
            {'  ·  '}{t('admin', 'lastLoginLabel')}: {item.last_login ? new Date(item.last_login).toLocaleDateString() : t('admin', 'neverLabel')}
          </Text>
          {isBanned && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: spacing.xs, backgroundColor: C.error + '15', borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 }}>
              <Ban size={10} color={C.error} />
              <Text style={{ color: C.error, ...typography.caption, fontWeight: '700' }}>{t('admin', 'bannedBadge')}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={() => openEdit(item)}
          style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: C.primary + '15', alignItems: 'center', justifyContent: 'center' }}
        >
          <Edit2 size={16} color={C.primary} />
        </TouchableOpacity>
        {!isSelf && (
          <>
            <TouchableOpacity
              onPress={() => handleToggleActive(item)}
              disabled={togglingId === item.id}
              style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: (isBanned ? C.success : C.warning) + '15', alignItems: 'center', justifyContent: 'center' }}
            >
              {togglingId === item.id ? (
                <ActivityIndicator size="small" color={isBanned ? C.success : C.warning} />
              ) : isBanned ? (
                <CheckCircle2 size={16} color={C.success} />
              ) : (
                <Ban size={16} color={C.warning} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleRemove(item)}
              disabled={removingId === item.id}
              style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: C.error + '15', alignItems: 'center', justifyContent: 'center' }}
            >
              {removingId === item.id ? <ActivityIndicator size="small" color={C.error} /> : <Trash2 size={16} color={C.error} />}
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }, [C, spacing, radius, typography, shadow, fontBold, fontRegular, t, adminUser, removingId, togglingId]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.heading }}>{t('admin', 'usersTitle')}</Text>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowCreate(true); }}
          style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderUser}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xl, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState emoji="🛡️" title={t('admin', 'usersEmptyTitle')} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.primary} colors={[C.primary]} progressBackgroundColor={C.card} />
          }
        />
      )}

      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View style={{ backgroundColor: C.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: insets.bottom + spacing.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
              <Text style={{ color: C.text, fontFamily: fontBold, ...typography.title }}>{t('admin', 'newAdminTitle')}</Text>
              <TouchableOpacity onPress={() => { setShowCreate(false); resetCreateForm(); }}>
                <XIcon size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('admin', 'usernameLabel')}</Text>
            <TextInput
              style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, ...typography.body }}
              placeholder={t('admin', 'usernamePlaceholder')}
              placeholderTextColor={C.textFaint}
              value={newUsername}
              onChangeText={setNewUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('admin', 'passwordLabel')}</Text>
            <TextInput
              style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, ...typography.body }}
              placeholder={t('admin', 'passwordPlaceholder')}
              placeholderTextColor={C.textFaint}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('admin', 'emailLabel')}</Text>
            <TextInput
              style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.xs, backgroundColor: C.card, borderColor: C.border, color: C.text, ...typography.body }}
              placeholder={t('admin', 'emailPlaceholder')}
              placeholderTextColor={C.textFaint}
              value={newEmail}
              onChangeText={setNewEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={{ color: C.textFaint, marginBottom: spacing.lg, ...typography.caption }}>{t('admin', 'emailCaption')}</Text>

            <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('admin', 'roleFieldLabel')}</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl }}>
              {(['admin', 'superadmin'] as const).map(r => (
                <TouchableOpacity
                  key={r}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setNewRole(r); }}
                  style={{
                    flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.md,
                    borderWidth: 1, borderColor: newRole === r ? C.primary : C.border,
                    backgroundColor: newRole === r ? C.primary + '15' : C.card,
                  }}
                >
                  <Text style={{ color: newRole === r ? C.primary : C.textMuted, ...typography.body, fontWeight: '700' }}>
                    {r === 'superadmin' ? t('admin', 'roleSuperadmin') : t('admin', 'roleAdmin')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button variant="primary" label={t('admin', 'createButton')} onPress={handleCreate} loading={creating} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={!!editingUser} animationType="slide" transparent onRequestClose={() => setEditingUser(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View style={{ backgroundColor: C.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: insets.bottom + spacing.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
              <Text style={{ color: C.text, fontFamily: fontBold, ...typography.title }}>{t('admin', 'editAdminTitle')}</Text>
              <TouchableOpacity onPress={() => setEditingUser(null)}>
                <XIcon size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('admin', 'usernameLabel')}</Text>
            <TextInput
              style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, ...typography.body }}
              placeholder={t('admin', 'usernamePlaceholder')}
              placeholderTextColor={C.textFaint}
              value={editUsername}
              onChangeText={setEditUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('admin', 'newPasswordOptionalLabel')}</Text>
            <TextInput
              style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, ...typography.body }}
              placeholder={t('admin', 'newPasswordOptionalPlaceholder')}
              placeholderTextColor={C.textFaint}
              value={editPassword}
              onChangeText={setEditPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('admin', 'roleFieldLabel')}</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl }}>
              {(['admin', 'superadmin'] as const).map(r => (
                <TouchableOpacity
                  key={r}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setEditRole(r); }}
                  style={{
                    flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.md,
                    borderWidth: 1, borderColor: editRole === r ? C.primary : C.border,
                    backgroundColor: editRole === r ? C.primary + '15' : C.card,
                  }}
                >
                  <Text style={{ color: editRole === r ? C.primary : C.textMuted, ...typography.body, fontWeight: '700' }}>
                    {r === 'superadmin' ? t('admin', 'roleSuperadmin') : t('admin', 'roleAdmin')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button variant="primary" label={t('common', 'save')} onPress={handleSaveEdit} loading={saving} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
