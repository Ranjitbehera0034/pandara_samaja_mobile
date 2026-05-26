// src/components/members/FilterModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity,
  ScrollView, Pressable
} from 'react-native';
import { X, Check } from 'lucide-react-native';

interface FilterOptions {
  districts: string[];
  talukas: Record<string, string[]>;
  panchayats: Record<string, string[]>;
}

interface FilterState {
  district: string;
  taluka: string;
  panchayat: string;
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

const GENDER_OPTIONS = [
  { value: '', label: 'All Genders' },
  { value: 'male', label: '♂ Male Head' },
  { value: 'female', label: '♀ Female Head' },
];

export default function FilterModal({ visible, onClose, options, filters, onChange, totalResults }: Props) {
  const [local, setLocal] = useState<FilterState>(filters);

  // Sync state when modal becomes visible
  useEffect(() => {
    if (visible) {
      setLocal(filters);
    }
  }, [visible, filters]);

  const talukas = local.district ? (options.talukas?.[local.district] || []) : [];
  const panchayats = local.taluka ? (options.panchayats?.[local.taluka] || []) : [];

  const apply = () => { onChange(local); onClose(); };
  const reset = () => {
    const empty = { district: '', taluka: '', panchayat: '', gender: '' };
    setLocal(empty);
    onChange(empty);
    onClose();
  };

  // Reusable option row
  const OptionRow = ({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) => (
    <TouchableOpacity
      onPress={onSelect}
      className={`flex-row items-center justify-between px-4 py-3 border-b border-slate-700/30 ${selected ? 'bg-blue-500/10' : ''}`}
    >
      <Text className={`text-sm ${selected ? 'text-blue-400 font-semibold' : 'text-slate-300'}`}>{label}</Text>
      {selected && <Check size={16} color="#3b82f6" />}
    </TouchableOpacity>
  );

  // Section component
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View className="mb-4">
      <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider px-4 py-2 bg-slate-900/40">
        {title}
      </Text>
      {children}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/60" onPress={onClose} />
      <View className="absolute bottom-0 left-0 right-0 bg-slate-800 rounded-t-3xl max-h-[85%]">
        {/* Header */}
        <View className="flex-row items-center justify-between p-5 border-b border-slate-700">
          <Text className="text-white font-bold text-lg">Filter Members</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* District */}
          <Section title="District">
            <OptionRow label="All Districts" selected={!local.district} onSelect={() => setLocal(f => ({ ...f, district: '', taluka: '', panchayat: '' }))} />
            {(options.districts || []).sort().map(d => (
              <OptionRow
                key={d} label={d}
                selected={local.district === d}
                onSelect={() => setLocal(f => ({ ...f, district: d, taluka: '', panchayat: '' }))}
              />
            ))}
          </Section>

          {/* Taluka — only if district selected */}
          {local.district && talukas.length > 0 && (
            <Section title="Taluka">
              <OptionRow label={`All Talukas in ${local.district}`} selected={!local.taluka} onSelect={() => setLocal(f => ({ ...f, taluka: '', panchayat: '' }))} />
              {talukas.sort().map(t => (
                <OptionRow key={t} label={t} selected={local.taluka === t} onSelect={() => setLocal(f => ({ ...f, taluka: t, panchayat: '' }))} />
              ))}
            </Section>
          )}

          {/* Panchayat — only if taluka selected */}
          {local.taluka && panchayats.length > 0 && (
            <Section title="Panchayat">
              <OptionRow label={`All Panchayats in ${local.taluka}`} selected={!local.panchayat} onSelect={() => setLocal(f => ({ ...f, panchayat: '' }))} />
              {panchayats.sort().map(p => (
                <OptionRow key={p} label={p} selected={local.panchayat === p} onSelect={() => setLocal(f => ({ ...f, panchayat: p }))} />
              ))}
            </Section>
          )}

          {/* Gender */}
          <Section title="Head of Family Gender">
            {GENDER_OPTIONS.map(g => (
              <OptionRow key={g.value} label={g.label} selected={local.gender === g.value} onSelect={() => setLocal(f => ({ ...f, gender: g.value }))} />
            ))}
          </Section>

          <View className="h-8" />
        </ScrollView>

        {/* Footer */}
        <View className="flex-row gap-3 p-4 border-t border-slate-700">
          <TouchableOpacity onPress={reset} className="flex-1 py-3 bg-slate-700 rounded-xl items-center">
            <Text className="text-white text-sm font-medium">Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={apply} className="flex-1 py-3 bg-blue-600 rounded-xl items-center">
            <Text className="text-white text-sm font-semibold">
              Show {totalResults.toLocaleString()} Results
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
