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
  const { colors, spacing, radius, typography } = useTheme();
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
    <View style={{ backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.md }}>
      {/* Question */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
        <Text style={{ color: colors.primaryLight, fontSize: 16 }}>📊</Text>
        <Text style={{ color: colors.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined, flex: 1, ...typography.bodyEmphasis }}>{localPoll.question}</Text>
      </View>

      {/* Options */}
      <View style={{ gap: spacing.sm }}>
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
              style={{ borderColor: isMyVote ? colors.primaryLight : colors.border, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, position: 'relative' }}
            >
              {/* Progress bar background */}
              {voted && (
                <View
                  style={{ backgroundColor: isMyVote ? colors.primary + '33' : colors.border + '4d', width: `${percentage}%`, position: 'absolute', top: 0, bottom: 0, left: 0 }}
                  pointerEvents="none"
                />
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
                <Text
                  style={{
                    color: isMyVote ? colors.primaryLight : colors.text,
                    fontFamily,
                    ...(isMyVote ? typography.bodyEmphasis : typography.body),
                  }}
                >
                  {isMyVote ? '✓ ' : ''}{option.text}
                </Text>
                {voted && (
                  <Text style={{ color: isMyVote ? colors.primaryLight : colors.textFaint, ...typography.bodyEmphasis }}>
                    {percentage}%
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Total votes */}
      <Text style={{ color: colors.textFaint, fontFamily, marginTop: spacing.md, ...typography.caption }}>
        {localPoll.totalVotes} {localPoll.totalVotes === 1 ? t('feedComponents', 'voteWord') : t('feedComponents', 'votesWordPlural')}
        {localPoll.endsAt ? ` · ${t('feedComponents', 'pollEndsPrefix')} ${new Date(localPoll.endsAt).toLocaleDateString()}` : ''}
      </Text>
    </View>
  );
}
