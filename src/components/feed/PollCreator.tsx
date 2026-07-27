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
  const { colors } = useTheme();
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
    <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="rounded-2xl p-4 border">
      <View className="flex-row items-center justify-between mb-4">
        <Text style={{ color: colors.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }} className="font-bold text-base">
          {t('feedComponents', 'createPollTitle')}
        </Text>
        <TouchableOpacity onPress={onCancel}>
          <X size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Question */}
      <Text style={{ color: colors.textMuted, fontFamily }} className="text-xs mb-1.5 font-medium">{t('feedComponents', 'pollQuestionLabel')}</Text>
      <TextInput
        style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text, fontFamily }}
        className="rounded-xl px-4 py-2.5 mb-4 text-sm border"
        placeholder={t('feedComponents', 'pollQuestionPlaceholder')}
        placeholderTextColor={colors.textFaint}
        value={question}
        onChangeText={setQuestion}
      />

      {/* Options */}
      <Text style={{ color: colors.textMuted, fontFamily }} className="text-xs mb-1.5 font-medium">{t('feedComponents', 'pollOptionsLabel')}</Text>
      <View className="gap-2.5 mb-4">
        {options.map((option, index) => (
          <View key={index} className="flex-row items-center gap-2">
            <TextInput
              style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text, fontFamily }}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm border"
              placeholder={`${t('feedComponents', 'pollOptionPlaceholderPrefix')} ${index + 1}`}
              placeholderTextColor={colors.textFaint}
              value={option}
              onChangeText={(text) => handleOptionChange(text, index)}
            />
            {options.length > 2 && (
              <TouchableOpacity
                onPress={() => handleRemoveOption(index)}
                style={{ backgroundColor: colors.error + '1a', borderColor: colors.error + '33' }}
                className="p-2.5 rounded-xl border"
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
          style={{ backgroundColor: colors.border + '80', borderColor: colors.border }}
          className="flex-row items-center justify-center gap-2 py-2.5 rounded-xl mb-4 border"
        >
          <Plus size={16} color={colors.text} />
          <Text style={{ color: colors.text, fontFamily }} className="text-sm font-semibold">{t('feedComponents', 'addOptionLabel')}</Text>
        </TouchableOpacity>
      )}

      {/* Actions */}
      <View className="flex-row gap-3">
        <TouchableOpacity
          onPress={onCancel}
          style={{ backgroundColor: colors.border, borderColor: colors.borderLight }}
          className="flex-1 py-2.5 rounded-xl items-center border"
        >
          <Text style={{ color: colors.text, fontFamily }} className="text-sm font-medium">{t('feedComponents', 'cancelButtonLabel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          style={{ backgroundColor: colors.primary }}
          className="flex-1 py-2.5 rounded-xl items-center"
        >
          <Text style={{ fontFamily }} className="text-white text-sm font-medium">{t('feedComponents', 'createButtonLabel')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
