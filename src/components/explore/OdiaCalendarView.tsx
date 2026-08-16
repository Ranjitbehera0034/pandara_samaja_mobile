// src/components/explore/OdiaCalendarView.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import {
  ChevronLeft, ChevronRight, Sun, Flag, Landmark, Sparkles, Heart, Music,
  BookOpen, Gift, PartyPopper, Flame, AlertTriangle,
} from 'lucide-react-native';
import { getPanchangForDate, PanchangDay } from '../../utils/panchang';
import { ODIA_FESTIVALS_2026, Festival, FestivalIcon } from '../../data/odiaFestivals';
import { FESTIVAL_IMAGES } from '../../data/festivalImages';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const CURATED_YEAR = 2026;

const ICONS: Record<FestivalIcon, React.ComponentType<any>> = {
  Sun, Flag, Landmark, Sparkles, Heart, Music, BookOpen, Gift, PartyPopper, Flame,
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
function firstWeekday(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

export default function OdiaCalendarView() {
  const { colors: C, spacing, radius, typography } = useTheme();
  const { lang, t } = useLanguage();
  const fontFamily = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontFamilyBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const festivalsByDate = useMemo(() => {
    const map: Record<string, Festival> = {};
    if (year === CURATED_YEAR) {
      for (const f of ODIA_FESTIVALS_2026) map[f.date] = f;
    }
    return map;
  }, [year]);

  const monthFestivals = useMemo(
    () => Object.values(festivalsByDate)
      .filter((f) => f.date.slice(0, 7) === `${year}-${String(month).padStart(2, '0')}`)
      .sort((a, b) => a.date.localeCompare(b.date)),
    [festivalsByDate, year, month]
  );

  const days = daysInMonth(year, month);
  const blanks = firstWeekday(year, month);

  const dateKey = (d: number) => `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const selectedDay = selectedDate ?? dateKey(Math.min(today.getDate(), days));
  const selectedPanchang: PanchangDay = useMemo(() => {
    const [y, m, d] = selectedDay.split('-').map(Number);
    return getPanchangForDate(new Date(y, m - 1, d));
  }, [selectedDay]);
  const selectedFestival = festivalsByDate[selectedDay];

  const goPrevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); } else { setMonth((m) => m - 1); }
    setSelectedDate(null);
  };
  const goNextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); } else { setMonth((m) => m + 1); }
    setSelectedDate(null);
  };

  const label = (k: string) => t('explore', k);

  return (
    <View>
      {year !== CURATED_YEAR && (
        <View style={{ flexDirection: 'row', gap: spacing.sm, backgroundColor: C.warning + '1a', borderColor: C.warning + '4d', borderRadius: radius.md, borderWidth: 1, padding: spacing.md, marginBottom: spacing.lg }}>
          <AlertTriangle size={16} color={C.warning} />
          <Text style={{ color: C.warning, flex: 1, fontFamily, ...typography.caption }}>
            {label('calendarUnverifiedDisclaimer')}
          </Text>
        </View>
      )}

      {/* Month navigator */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
        <TouchableOpacity onPress={goPrevMonth} style={{ width: 32, height: 32, borderRadius: radius.full, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={18} color={C.textMuted} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontFamilyBold, ...typography.bodyEmphasis }}>
          {MONTH_NAMES[month - 1]} {year}
        </Text>
        <TouchableOpacity onPress={goNextMonth} style={{ width: 32, height: 32, borderRadius: radius.full, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronRight size={18} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      <Text style={{ color: C.textMuted, marginBottom: spacing.md, fontFamily, ...typography.caption }}>
        {label('calendarMasaLabel')}: {selectedPanchang.masa} ({selectedPanchang.masaEn})
      </Text>

      {/* Weekday header */}
      <View style={{ flexDirection: 'row', marginBottom: spacing.xs }}>
        {WEEKDAY_LABELS.map((w) => (
          <Text key={w} style={{ flex: 1, textAlign: 'center', color: C.textFaint, ...typography.caption }}>{w}</Text>
        ))}
      </View>

      {/* Day grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg }}>
        {Array.from({ length: blanks }).map((_, i) => (
          <View key={`blank-${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />
        ))}
        {Array.from({ length: days }).map((_, i) => {
          const d = i + 1;
          const key = dateKey(d);
          const festival = festivalsByDate[key];
          const isSelected = key === selectedDay;
          const Icon = festival ? ICONS[festival.icon] : null;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setSelectedDate(key)}
              style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}
            >
              <View
                style={{
                  flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md,
                  backgroundColor: festival ? C.warning + '1a' : (isSelected ? C.primary + '1a' : 'transparent'),
                  borderWidth: festival ? 1 : 0, borderColor: C.warning + '4d',
                }}
              >
                {Icon ? <Icon size={14} color={C.warning} /> : (
                  <Text style={{ ...typography.body, color: isSelected ? C.primaryLight : C.text, fontWeight: isSelected ? '700' : '400' }}>{d}</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Day detail card */}
      <View style={{ backgroundColor: C.card + '80', borderColor: C.border + '80', borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg }} className="border">
        {selectedFestival?.imageKey && FESTIVAL_IMAGES[selectedFestival.imageKey] && (
          <Image
            source={FESTIVAL_IMAGES[selectedFestival.imageKey]}
            style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: radius.md, marginBottom: spacing.md, backgroundColor: C.bg }}
            contentFit="cover"
            transition={150}
          />
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
          {selectedFestival && (() => {
            const Icon = ICONS[selectedFestival.icon];
            return (
              <View style={{ width: 32, height: 32, borderRadius: radius.full, backgroundColor: C.warning + '1a', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} color={C.warning} />
              </View>
            );
          })()}
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontFamily: fontFamilyBold, ...typography.bodyEmphasis }}>
              {selectedDay} · {selectedPanchang.dayName} <Text style={{ color: C.textMuted, fontWeight: '400' }}>({selectedPanchang.dayNameEn})</Text>
            </Text>
            {selectedFestival && (
              <Text style={{ color: C.warning, fontFamily, ...typography.caption, fontWeight: '600' }}>
                {selectedFestival.or} · {selectedFestival.en}{selectedFestival.uncertain ? ' ⚠' : ''}
              </Text>
            )}
          </View>
        </View>

        {[
          [label('calendarSunriseSunsetLabel'), `${selectedPanchang.sunrise} – ${selectedPanchang.sunset}`],
          [label('calendarTithiLabel'), `${selectedPanchang.paksha} ${selectedPanchang.tithi} (${label('calendarTillLabel')} ${selectedPanchang.tithiEnd})`],
          [label('calendarNakshatraLabel'), `${selectedPanchang.nakshatra} (${label('calendarTillLabel')} ${selectedPanchang.nakshatraEnd})`],
          [label('calendarYogaKaranaLabel'), `${selectedPanchang.yoga} · ${selectedPanchang.karana}`],
          [label('calendarRashiLabel'), `${selectedPanchang.rashi} (${selectedPanchang.rashiEn})`],
          [label('calendarRituLabel'), selectedPanchang.ritu],
        ].map(([lbl, val]) => (
          <View key={lbl} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
            <Text style={{ color: C.textMuted, fontFamily, ...typography.caption }}>{lbl}</Text>
            <Text style={{ color: C.text, ...typography.caption }}>{val}</Text>
          </View>
        ))}
      </View>

      {/* Special days list */}
      <Text style={{ color: C.textMuted, fontFamily: fontFamilyBold, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.3, ...typography.caption }}>
        {label('calendarSpecialDaysTitle')}
      </Text>
      {monthFestivals.length === 0 ? (
        <Text style={{ color: C.textFaint, fontFamily, ...typography.caption }}>{label('calendarNoFestivalsThisMonth')}</Text>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {monthFestivals.map((f) => {
            const Icon = ICONS[f.icon];
            const d = parseInt(f.date.slice(8, 10), 10);
            return (
              <TouchableOpacity
                key={f.date}
                onPress={() => setSelectedDate(f.date)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs, borderBottomColor: C.border + '4d', borderBottomWidth: 1 }}
              >
                <View style={{ width: 26, height: 26, borderRadius: radius.full, backgroundColor: C.warning + '1a', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={13} color={C.warning} />
                </View>
                <Text style={{ ...typography.caption, color: C.text, fontWeight: '600', width: 20 }}>{d}</Text>
                <Text style={{ color: C.text, flex: 1, fontFamily, ...typography.caption }}>
                  {f.en}{f.uncertain ? ' ⚠' : ''} <Text style={{ color: C.textMuted }}>({f.or})</Text>
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}
