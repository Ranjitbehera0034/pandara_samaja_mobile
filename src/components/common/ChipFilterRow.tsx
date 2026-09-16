// src/components/common/ChipFilterRow.tsx
// Wraps a set of <Chip>s onto as many rows as needed instead of a single
// horizontally-scrolling row. A scrollable row's last chip gets sliced off
// by the screen edge with no reliable way to signal "swipe for more" —
// tried a fade mask + a visible scroll indicator first, but both were too
// subtle against this app's near-white light theme (bg #f8fafc vs card
// #ffffff) and iOS's momentary (interaction-only) scroll indicator to
// read as intentional rather than a rendering bug (reported as "chips are
// cropped" on CoursesScreen's category row). Wrapping costs some vertical
// space but every chip is always fully visible, matching the same
// flexWrap pattern already used for the Government/Private toggle above
// this row on JobsScreen and the sector picker in the job edit-suggestion
// modal.
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  children: React.ReactNode;
}

export default function ChipFilterRow({ children }: Props) {
  const { spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
      }}
    >
      {children}
    </View>
  );
}
