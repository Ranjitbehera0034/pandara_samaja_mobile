// src/components/feed/PollCreator.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Trash2, Plus, X } from 'lucide-react-native';
import { Poll } from '../../types';

interface Props {
  onSave: (poll: Poll) => void;
  onCancel: () => void;
}

export default function PollCreator({ onSave, onCancel }: Props) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);

  const handleAddOption = () => {
    if (options.length >= 5) {
      Alert.alert('Limit Reached', 'You can add up to 5 options.');
      return;
    }
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      Alert.alert('Required', 'A poll requires at least 2 options.');
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
      Alert.alert('Error', 'Please enter a poll question.');
      return;
    }
    const filteredOptions = options.map(o => o.trim()).filter(Boolean);
    if (filteredOptions.length < 2) {
      Alert.alert('Error', 'Please enter at least 2 valid options.');
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
    <View className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-white font-bold text-base">Create Poll</Text>
        <TouchableOpacity onPress={onCancel}>
          <X size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Question */}
      <Text className="text-slate-400 text-xs mb-1.5 font-medium">Question</Text>
      <TextInput
        className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white mb-4 text-sm"
        placeholder="What would you like to ask?"
        placeholderTextColor="#64748b"
        value={question}
        onChangeText={setQuestion}
      />

      {/* Options */}
      <Text className="text-slate-400 text-xs mb-1.5 font-medium">Options</Text>
      <View className="gap-2.5 mb-4">
        {options.map((option, index) => (
          <View key={index} className="flex-row items-center gap-2">
            <TextInput
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm"
              placeholder={`Option ${index + 1}`}
              placeholderTextColor="#64748b"
              value={option}
              onChangeText={(text) => handleOptionChange(text, index)}
            />
            {options.length > 2 && (
              <TouchableOpacity
                onPress={() => handleRemoveOption(index)}
                className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl"
              >
                <Trash2 size={16} color="#f87171" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      {/* Add option */}
      {options.length < 5 && (
        <TouchableOpacity
          onPress={handleAddOption}
          className="flex-row items-center justify-center gap-2 py-2.5 bg-slate-700/50 rounded-xl mb-4 border border-slate-700"
        >
          <Plus size={16} color="#f8fafc" />
          <Text className="text-white text-sm font-semibold">Add Option</Text>
        </TouchableOpacity>
      )}

      {/* Actions */}
      <View className="flex-row gap-3">
        <TouchableOpacity
          onPress={onCancel}
          className="flex-1 py-2.5 bg-slate-700 rounded-xl items-center border border-slate-600"
        >
          <Text className="text-white text-sm font-medium">Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          className="flex-1 py-2.5 bg-blue-600 rounded-xl items-center"
        >
          <Text className="text-white text-sm font-medium">Create</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
