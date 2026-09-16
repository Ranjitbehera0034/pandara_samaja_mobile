// src/components/common/ChipFilterRow.tsx
// Compact category/sector filter — a single trigger pill (showing "All"
// or the current selection) that opens a bottom sheet with every option
// laid out as wrapped chips. An earlier version showed every chip inline
// in a horizontally-scrolling row, but the last chip got sliced off by
// the screen edge with no way to tell it was scrollable (reported as
// "chips are cropped"). Wrapping every chip inline fixed that but pushed
// the actual content below 6+ rows of filter chips before any of it was
// visible on screens with many options (e.g. Courses' 12 categories) —
// a filter sheet keeps the collapsed state to one compact row while
// still making every option fully visible once opened.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Filter, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Chip from './Chip';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface Option {
  key: string;
  label: string;
}

interface Props {
  title: string;
  allLabel: string;
  options: Option[];
  selected: string | null;
  onSelect: (key: string | null) => void;
}

export default function ChipFilterRow({ title, allLabel, options, selected, onSelect }: Props) {
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;
  const [open, setOpen] = useState(false);

  const selectedOption = options.find(o => o.key === selected);
  const triggerLabel = selectedOption ? selectedOption.label : allLabel;

  const handleSelect = (key: string | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(key);
    setOpen(false);
  };

  return (
    <>
      <View style={{ flexDirection: 'row', paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setOpen(true); }}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: spacing.xs, maxWidth: '80%',
            paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
            borderRadius: radius.full, backgroundColor: selectedOption ? C.primary : C.card,
            borderWidth: 1, borderColor: selectedOption ? C.primary : C.border,
          }}
        >
          <Filter size={14} color={selectedOption ? '#fff' : C.textMuted} />
          <Text
            numberOfLines={1}
            style={{ color: selectedOption ? '#fff' : C.textMuted, fontFamily: fontRegular, ...typography.caption, fontWeight: '700' }}
          >
            {triggerLabel}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '75%', ...shadow.raised }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderColor: C.border }}>
              <Text style={{ color: C.text, fontFamily: fontBold, ...typography.title }}>{title}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={{ padding: spacing.xs }}>
                <X size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, padding: spacing.lg }}>
              <Chip label={allLabel} selected={selected === null} onPress={() => handleSelect(null)} />
              {options.map(o => (
                <Chip key={o.key} label={o.label} selected={selected === o.key} onPress={() => handleSelect(o.key)} />
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
