// src/components/members/FilterModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity,
  ScrollView, Pressable
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import Button from '../common/Button';

interface FilterOptions {
  districts: string[];
  talukas: Record<string, string[]>;
  panchayats: Record<string, string[]>;
  villages: Record<string, string[]>;
}

interface FilterState {
  district: string;
  taluka: string;
  panchayat: string;
  village: string;
  gender: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  options: FilterOptions;
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  totalResults: number;
}

export default function FilterModal({ visible, onClose, options, filters, onChange, totalResults }: Props) {
  const { colors: C, spacing, radius, typography } = useTheme();
  const { lang, t } = useLanguage();
  const [local, setLocal] = useState<FilterState>(filters);

  const GENDER_OPTIONS = [
    { value: '', label: t('members', 'allGenders') },
    { value: 'male', label: t('members', 'maleHead') },
    { value: 'female', label: t('members', 'femaleHead') },
  ];

  // Sync state when modal becomes visible
  useEffect(() => {
    if (visible) {
      setLocal(filters);
    }
  }, [visible, filters]);

  const talukas = local.district ? (options.talukas?.[local.district] || []) : [];
  const panchayats = local.taluka ? (options.panchayats?.[local.taluka] || []) : [];
  const villages = local.panchayat ? (options.villages?.[local.panchayat] || []) : [];

  const apply = () => { onChange(local); onClose(); };
  const reset = () => {
    const empty = { district: '', taluka: '', panchayat: '', village: '', gender: '' };
    setLocal(empty);
    onChange(empty);
    onClose();
  };

  // Reusable option row
  const OptionRow = ({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) => (
    <TouchableOpacity
      onPress={onSelect}
      style={{
        borderColor: C.border + '4d',
        backgroundColor: selected ? C.primary + '1a' : 'transparent',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md - 1,
      }}
      className="flex-row items-center justify-between border-b"
    >
      <Text
        style={{
          color: selected ? C.primaryLight : C.textMuted,
          fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined,
          fontSize: typography.body.fontSize,
          lineHeight: typography.body.lineHeight,
          fontWeight: selected ? '600' : typography.body.fontWeight,
        }}
      >
        {label}
      </Text>
      {selected && <Check size={16} color={C.primaryLight} />}
    </TouchableOpacity>
  );

  // Section component
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={{ marginBottom: spacing.lg }}>
      <Text
        style={{
          color: C.textFaint,
          backgroundColor: C.bg + '99',
          fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined,
          fontSize: typography.caption.fontSize,
          fontWeight: '700',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
        }}
        className="uppercase tracking-wider"
      >
        {title}
      </Text>
      {children}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/60" onPress={onClose} />
      <View style={{ backgroundColor: C.card, borderTopLeftRadius: radius.xl + 4, borderTopRightRadius: radius.xl + 4 }} className="absolute bottom-0 left-0 right-0 max-h-[85%]">
        {/* Header */}
        <View style={{ borderColor: C.border, padding: spacing.xl - 4 }} className="flex-row items-center justify-between border-b">
          <Text
            style={{
              color: C.text,
              fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined,
              fontSize: typography.title.fontSize,
              lineHeight: typography.title.lineHeight,
              fontWeight: typography.title.fontWeight,
            }}
          >
            {t('members', 'filterModalTitle')}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <X size={20} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* District */}
          <Section title={t('members', 'districtSectionTitle')}>
            <OptionRow label={t('members', 'allDistricts')} selected={!local.district} onSelect={() => setLocal(f => ({ ...f, district: '', taluka: '', panchayat: '', village: '' }))} />
            {(options.districts || []).sort().map(d => (
              <OptionRow
                key={d} label={d}
                selected={local.district === d}
                onSelect={() => setLocal(f => ({ ...f, district: d, taluka: '', panchayat: '', village: '' }))}
              />
            ))}
          </Section>

          {/* Taluka — only if district selected */}
          {local.district && talukas.length > 0 && (
            <Section title={t('members', 'talukaSectionTitle')}>
              <OptionRow label={`${t('members', 'allTalukasInPrefix')} ${local.district}`} selected={!local.taluka} onSelect={() => setLocal(f => ({ ...f, taluka: '', panchayat: '', village: '' }))} />
              {talukas.sort().map(tk => (
                <OptionRow key={tk} label={tk} selected={local.taluka === tk} onSelect={() => setLocal(f => ({ ...f, taluka: tk, panchayat: '', village: '' }))} />
              ))}
            </Section>
          )}

          {/* Panchayat — only if taluka selected */}
          {local.taluka && panchayats.length > 0 && (
            <Section title={t('members', 'panchayatSectionTitle')}>
              <OptionRow label={`${t('members', 'allPanchayatsInPrefix')} ${local.taluka}`} selected={!local.panchayat} onSelect={() => setLocal(f => ({ ...f, panchayat: '', village: '' }))} />
              {panchayats.sort().map(p => (
                <OptionRow key={p} label={p} selected={local.panchayat === p} onSelect={() => setLocal(f => ({ ...f, panchayat: p, village: '' }))} />
              ))}
            </Section>
          )}

          {/* Village — only if panchayat selected */}
          {local.panchayat && villages.length > 0 && (
            <Section title={t('members', 'villageSectionTitle')}>
              <OptionRow label={`${t('members', 'allVillagesInPrefix')} ${local.panchayat}`} selected={!local.village} onSelect={() => setLocal(f => ({ ...f, village: '' }))} />
              {villages.sort().map(v => (
                <OptionRow key={v} label={v} selected={local.village === v} onSelect={() => setLocal(f => ({ ...f, village: v }))} />
              ))}
            </Section>
          )}

          {/* Gender */}
          <Section title={t('members', 'genderSectionTitle')}>
            {GENDER_OPTIONS.map(g => (
              <OptionRow key={g.value} label={g.label} selected={local.gender === g.value} onSelect={() => setLocal(f => ({ ...f, gender: g.value }))} />
            ))}
          </Section>

          <View style={{ height: spacing.xl + 8 }} />
        </ScrollView>

        {/* Footer */}
        <View style={{ borderColor: C.border, padding: spacing.lg, gap: spacing.md }} className="flex-row border-t">
          <View style={{ flex: 1 }}>
            <Button label={t('members', 'resetButton')} onPress={reset} variant="secondary" />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label={`${t('members', 'showResultsPrefix')} ${totalResults.toLocaleString()} ${t('members', 'showResultsSuffix')}`}
              onPress={apply}
              variant="primary"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
