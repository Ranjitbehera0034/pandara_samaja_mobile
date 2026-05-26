// src/components/feed/PollDisplay.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Poll } from '../../types';

interface Props {
  poll: Poll;
  onVote: (optionId: string) => void;
}

export default function PollDisplay({ poll, onVote }: Props) {
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

  return (
    <View className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-4 mt-3">
      {/* Question */}
      <View className="flex-row items-center gap-2 mb-3">
        <Text className="text-blue-400 text-base">📊</Text>
        <Text className="text-white font-semibold text-sm flex-1">{localPoll.question}</Text>
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
              className={`rounded-xl overflow-hidden border ${isMyVote
                ? 'border-blue-500/50'
                : 'border-slate-700/50'
              } relative`}
            >
              {/* Progress bar background */}
              {voted && (
                <View
                  className={`absolute inset-y-0 left-0 ${isMyVote ? 'bg-blue-500/20' : 'bg-slate-700/30'}`}
                  style={{ width: `${percentage}%` }}
                />
              )}
              <View className="flex-row items-center justify-between px-4 py-3">
                <Text className={`text-sm ${isMyVote ? 'text-blue-300 font-semibold' : 'text-slate-300'}`}>
                  {isMyVote ? '✓ ' : ''}{option.text}
                </Text>
                {voted && (
                  <Text className={`text-sm font-semibold ${isMyVote ? 'text-blue-400' : 'text-slate-500'}`}>
                    {percentage}%
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Total votes */}
      <Text className="text-slate-500 text-xs mt-3">
        {localPoll.totalVotes} {localPoll.totalVotes === 1 ? 'vote' : 'votes'}
        {localPoll.endsAt ? ` · Ends ${new Date(localPoll.endsAt).toLocaleDateString()}` : ''}
      </Text>
    </View>
  );
}
