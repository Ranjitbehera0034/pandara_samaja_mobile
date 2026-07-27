// src/components/feed/PollDisplay.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Poll } from '../../types';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface Props {
  poll: Poll;
  onVote: (optionId: string) => void;
}

export default function PollDisplay({ poll, onVote }: Props) {
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
  const [voted, setVoted] = useState(!!poll.myVote);
  const [myVote, setMyVote] = useState(poll.myVote);
  const [localPoll, setLocalPoll] = useState(poll);

  const handleVote = (optionId: string) => {
    if (voted) return;
    setVoted(true);
    setMyVote(optionId);
    const updated = localPoll.options.map(opt =>
      opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
    );
    setLocalPoll({
      ...localPoll,
      options: updated,
      totalVotes: localPoll.totalVotes + 1,
      myVote: optionId
    });
    onVote(optionId);
  };

  const fontFamily = lang === 'od' ? 'NotoSansOriya' : undefined;

  return (
    <View style={{ backgroundColor: colors.bg, borderColor: colors.border }} className="border rounded-xl p-4 mt-3">
      {/* Question */}
      <View className="flex-row items-center gap-2 mb-3">
        <Text style={{ color: colors.primaryLight }} className="text-base">📊</Text>
        <Text style={{ color: colors.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }} className="font-semibold text-sm flex-1">{localPoll.question}</Text>
      </View>

      {/* Options */}
      <View className="gap-2">
        {localPoll.options.map(option => {
          const percentage = localPoll.totalVotes > 0
            ? Math.round((option.votes / localPoll.totalVotes) * 100)
            : 0;
          const isMyVote = myVote === option.id;

          return (
            <TouchableOpacity
              key={option.id}
              onPress={() => handleVote(option.id)}
              disabled={voted}
              style={{ borderColor: isMyVote ? colors.primaryLight : colors.border }}
              className="rounded-xl overflow-hidden border relative"
            >
              {/* Progress bar background */}
              {voted && (
                <View
                  style={{ backgroundColor: isMyVote ? colors.primary + '33' : colors.border + '4d', width: `${percentage}%` }}
                  className="absolute inset-y-0 left-0"
                  pointerEvents="none"
                />
              )}
              <View className="flex-row items-center justify-between px-4 py-3">
                <Text
                  style={{ color: isMyVote ? colors.primaryLight : colors.text, fontFamily }}
                  className={`text-sm ${isMyVote ? 'font-semibold' : ''}`}
                >
                  {isMyVote ? '✓ ' : ''}{option.text}
                </Text>
                {voted && (
                  <Text style={{ color: isMyVote ? colors.primaryLight : colors.textFaint }} className="text-sm font-semibold">
                    {percentage}%
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Total votes */}
      <Text style={{ color: colors.textFaint, fontFamily }} className="text-xs mt-3">
        {localPoll.totalVotes} {localPoll.totalVotes === 1 ? t('feedComponents', 'voteWord') : t('feedComponents', 'votesWordPlural')}
        {localPoll.endsAt ? ` · ${t('feedComponents', 'pollEndsPrefix')} ${new Date(localPoll.endsAt).toLocaleDateString()}` : ''}
      </Text>
    </View>
  );
}
