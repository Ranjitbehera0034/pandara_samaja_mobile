// src/components/feed/PollCreator.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Trash2, Plus, X } from 'lucide-react-native';
import { Poll } from '../../types';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface Props {
  onSave: (poll: Poll) => void;
  onCancel: () => void;
}

export default function PollCreator({ onSave, onCancel }: Props) {
  const { colors, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);

  const fontFamily = lang === 'od' ? 'NotoSansOriya' : undefined;

  const handleAddOption = () => {
    if (options.length >= 5) {
      Alert.alert(t('feedComponents', 'pollLimitReachedTitle'), t('feedComponents', 'pollLimitReachedMessage'));
      return;
    }
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      Alert.alert(t('feedComponents', 'pollMinOptionsTitle'), t('feedComponents', 'pollMinOptionsMessage'));
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (text: string, index: number) => {
    const updated = [...options];
    updated[index] = text;
    setOptions(updated);
  };

  const handleSave = () => {
    if (!question.trim()) {
      Alert.alert(t('feedComponents', 'genericErrorTitle'), t('feedComponents', 'pollQuestionRequiredMessage'));
      return;
    }
    const filteredOptions = options.map(o => o.trim()).filter(Boolean);
    if (filteredOptions.length < 2) {
      Alert.alert(t('feedComponents', 'genericErrorTitle'), t('feedComponents', 'pollOptionsRequiredMessage'));
      return;
    }

    const pollData: Poll = {
      question: question.trim(),
      options: filteredOptions.map((text, index) => ({
        id: index.toString(),
        text,
        votes: 0,
      })),
      totalVotes: 0,
      endsAt: new Date(Date.now() + 7 * 86400000).toISOString(), // 7 days from now
    };

    onSave(pollData);
  };

  return (
    <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, ...shadow.raised }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
        <Text style={{ color: colors.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined, ...typography.title }}>
          {t('feedComponents', 'createPollTitle')}
        </Text>
        <TouchableOpacity onPress={onCancel}>
          <X size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Question */}
      <Text style={{ color: colors.textMuted, fontFamily, marginBottom: spacing.xs, ...typography.bodyEmphasis }}>{t('feedComponents', 'pollQuestionLabel')}</Text>
      <TextInput
        style={{
          backgroundColor: colors.bg,
          borderColor: colors.border,
          color: colors.text,
          fontFamily,
          borderRadius: radius.md,
          borderWidth: 1,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm + 2,
          marginBottom: spacing.lg,
          ...typography.body,
        }}
        placeholder={t('feedComponents', 'pollQuestionPlaceholder')}
        placeholderTextColor={colors.textFaint}
        value={question}
        onChangeText={setQuestion}
      />

      {/* Options */}
      <Text style={{ color: colors.textMuted, fontFamily, marginBottom: spacing.xs, ...typography.bodyEmphasis }}>{t('feedComponents', 'pollOptionsLabel')}</Text>
      <View style={{ gap: spacing.sm + 2, marginBottom: spacing.lg }}>
        {options.map((option, index) => (
          <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <TextInput
              style={{
                backgroundColor: colors.bg,
                borderColor: colors.border,
                color: colors.text,
                fontFamily,
                flex: 1,
                borderRadius: radius.md,
                borderWidth: 1,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm + 2,
                ...typography.body,
              }}
              placeholder={`${t('feedComponents', 'pollOptionPlaceholderPrefix')} ${index + 1}`}
              placeholderTextColor={colors.textFaint}
              value={option}
              onChangeText={(text) => handleOptionChange(text, index)}
            />
            {options.length > 2 && (
              <TouchableOpacity
                onPress={() => handleRemoveOption(index)}
                style={{ backgroundColor: colors.error + '1a', borderColor: colors.error + '33', padding: spacing.sm + 2, borderRadius: radius.md, borderWidth: 1 }}
              >
                <Trash2 size={16} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      {/* Add option */}
      {options.length < 5 && (
        <TouchableOpacity
          onPress={handleAddOption}
          style={{
            backgroundColor: colors.border + '80',
            borderColor: colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            paddingVertical: spacing.sm + 2,
            borderRadius: radius.md,
            marginBottom: spacing.lg,
            borderWidth: 1,
          }}
        >
          <Plus size={16} color={colors.text} />
          <Text style={{ color: colors.text, fontFamily, ...typography.bodyEmphasis }}>{t('feedComponents', 'addOptionLabel')}</Text>
        </TouchableOpacity>
      )}

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <TouchableOpacity
          onPress={onCancel}
          style={{ backgroundColor: colors.border, borderColor: colors.borderLight, flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.md, alignItems: 'center', borderWidth: 1 }}
        >
          <Text style={{ color: colors.text, fontFamily, ...typography.bodyEmphasis }}>{t('feedComponents', 'cancelButtonLabel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          style={{ backgroundColor: colors.primary, flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.md, alignItems: 'center' }}
        >
          <Text style={{ fontFamily, color: '#fff', ...typography.bodyEmphasis }}>{t('feedComponents', 'createButtonLabel')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
