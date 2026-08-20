import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ImageBackground,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BookOpenText, CalendarDays, Check, ChevronDown, HeartPulse, Sparkles, X } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle as SvgCircle, Line as SvgLine, Path as SvgPath } from "react-native-svg";
import { useAuth } from "../../context/AuthContext";
import {
  getCheckIns,
  getJournalEntries,
  getPracticeEvents,
  type PracticeActivity,
  type StoredJournalEntry,
} from "../../services/wellness/wellnessApi";
import type { DailyCheckIn } from "../../types/wellness";
import { appSansFont as bodyFont, screenLayout, typeScale } from "../../theme/typography";

type HistoryFilter = "all" | "journal" | "check-in";
type HistoryRange = "week" | "previous" | "all";
type HistoryItem =
  | { id: string; kind: "journal"; date: string; entry: StoredJournalEntry }
  | { id: string; kind: "check-in"; date: string; checkIn: DailyCheckIn };

const filters: { id: HistoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "journal", label: "Reflections" },
  { id: "check-in", label: "Check-ins" },
];

const rangeOptions: { id: HistoryRange; label: string; description: string }[] = [
  { id: "week", label: "This week", description: "The latest seven days" },
  { id: "previous", label: "Previous week", description: "The seven days before this week" },
  { id: "all", label: "All history", description: "Every saved reflection and check-in" },
];

const stateScores: Record<string, number> = {
  Overwhelmed: 1,
  Anxious: 2,
  Numb: 2,
  Okay: 4,
  Calm: 5,
};

type TrendDay = {
  date: Date;
  dateKey: string;
  score?: number;
  state?: string;
};

function dateFromKey(date: string) {
  return new Date(`${date.slice(0, 10)}T12:00:00`);
}

function toDateKey(value: string) {
  return value.slice(0, 10);
}

function formatGroupDate(date: string) {
  const value = dateFromKey(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (value.toDateString() === today.toDateString()) return "Today";
  if (value.toDateString() === yesterday.toDateString()) return "Yesterday";
  return value.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRangeBounds(range: HistoryRange) {
  if (range === "all") return null;
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  if (range === "previous") end.setDate(end.getDate() - 7);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function TrendChart({ days }: { days: TrendDay[] }) {
  const points = days.flatMap((day, index) => {
    if (day.score === undefined) return [];
    return [{ x: 20 + index * (260 / 6), y: 104 - ((day.score - 1) / 4) * 76 }];
  });
  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = points.length > 1
    ? `${linePath} L ${points[points.length - 1].x} 112 L ${points[0].x} 112 Z`
    : "";

  return (
    <View style={styles.chartWrap}>
      <View style={styles.chartStage}>
        <Svg height="132" viewBox="0 0 300 132" width="100%">
          {[28, 66, 104].map((y) => (
            <SvgLine key={y} stroke="rgba(95,59,43,0.10)" strokeWidth="1" x1="14" x2="286" y1={y} y2={y} />
          ))}
          {areaPath ? <SvgPath d={areaPath} fill="rgba(223,162,177,0.16)" /> : null}
          {linePath ? <SvgPath d={linePath} fill="none" stroke="#9A5B6A" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" /> : null}
          {points.map((point) => (
            <SvgCircle cx={point.x} cy={point.y} fill="#FFF8EE" key={`${point.x}-${point.y}`} r="5" stroke="#9A5B6A" strokeWidth="3" />
          ))}
        </Svg>
        {points.length === 0 ? (
          <Text style={styles.chartEmpty}>Complete a check-in to begin your trend.</Text>
        ) : null}
      </View>
      <View style={styles.chartLabels}>
        {days.map((day) => (
          <View key={day.dateKey} style={styles.chartDay}>
            <View style={[styles.rhythmDot, day.score !== undefined && styles.rhythmDotActive]}>
              {day.score !== undefined ? <View style={styles.rhythmDotCore} /> : null}
            </View>
            <Text style={styles.chartDayText}>
              {day.date.toLocaleDateString(undefined, { weekday: "narrow" })}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const { runAuthenticated } = useAuth();
  const [entries, setEntries] = useState<StoredJournalEntry[]>([]);
  const [checkIns, setCheckIns] = useState<DailyCheckIn[]>([]);
  const [practiceEvents, setPracticeEvents] = useState<PracticeActivity[]>([]);
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [range, setRange] = useState<HistoryRange>("week");
  const [rangeOpen, setRangeOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadHistory = useCallback(async (refreshing = false) => {
    if (refreshing) setIsRefreshing(true);
    try {
      const [savedEntries, savedCheckIns, savedPracticeEvents] = await runAuthenticated((token) =>
        Promise.all([getJournalEntries(token), getCheckIns(token), getPracticeEvents(token)])
      );
      setEntries(savedEntries);
      setCheckIns(savedCheckIns);
      setPracticeEvents(savedPracticeEvents);
    } catch (error) {
      console.warn("Unable to load history", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [runAuthenticated]);

  useFocusEffect(useCallback(() => {
    void loadHistory();
  }, [loadHistory]));

  const rangeBounds = useMemo(() => getRangeBounds(range), [range]);
  const rangeLabel = rangeOptions.find((option) => option.id === range)?.label ?? "This week";

  const visibleEntries = useMemo(() => entries.filter((entry) => {
    if (!rangeBounds) return true;
    const date = new Date(entry.createdAt);
    return date >= rangeBounds.start && date <= rangeBounds.end;
  }), [entries, rangeBounds]);

  const visibleCheckIns = useMemo(() => checkIns.filter((checkIn) => {
    if (!rangeBounds) return true;
    const date = dateFromKey(checkIn.date);
    return date >= rangeBounds.start && date <= rangeBounds.end;
  }), [checkIns, rangeBounds]);

  const visiblePracticeEvents = useMemo(() => practiceEvents.filter((event) => {
    if (!rangeBounds) return true;
    const date = new Date(event.createdAt);
    return date >= rangeBounds.start && date <= rangeBounds.end;
  }), [practiceEvents, rangeBounds]);

  const groupedItems = useMemo(() => {
    const allItems: HistoryItem[] = [
      ...visibleEntries.map((entry): HistoryItem => ({
        id: `journal-${entry.id}`,
        kind: "journal",
        date: entry.createdAt,
        entry,
      })),
      ...visibleCheckIns.map((checkIn): HistoryItem => ({
        id: `check-in-${checkIn.id}`,
        kind: "check-in",
        date: checkIn.createdAt,
        checkIn,
      })),
    ]
      .filter((item) => filter === "all" || item.kind === filter)
      .sort((a, b) => b.date.localeCompare(a.date));

    return allItems.reduce<{ date: string; items: HistoryItem[] }[]>((groups, item) => {
      const date = item.kind === "check-in" ? item.checkIn.date : toDateKey(item.date);
      const current = groups[groups.length - 1];
      if (current?.date === date) current.items.push(item);
      else groups.push({ date, items: [item] });
      return groups;
    }, []);
  }, [filter, visibleCheckIns, visibleEntries]);

  const trendDays = useMemo<TrendDay[]>(() => {
    const checkInsByDate = new Map(checkIns.map((checkIn) => [checkIn.date, checkIn]));
    const anchor = new Date();
    if (range === "previous") anchor.setDate(anchor.getDate() - 7);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(anchor);
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      const dateKey = localDateKey(date);
      const checkIn = checkInsByDate.get(dateKey);
      return {
        date,
        dateKey,
        score: checkIn ? stateScores[checkIn.answers.state] : undefined,
        state: checkIn?.answers.state,
      };
    });
  }, [checkIns, range]);

  const weeklyInsight = useMemo(() => {
    const counts = trendDays.reduce<Record<string, number>>((result, day) => {
      if (day.state) result[day.state] = (result[day.state] ?? 0) + 1;
      return result;
    }, {});
    const mostCommon = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const checkInCount = trendDays.filter((day) => day.state).length;
    return {
      checkInCount,
      copy: mostCommon ? `${mostCommon} appeared most often` : "Your pattern will appear here",
    };
  }, [trendDays]);

  const topPractices = useMemo(() => {
    const totals = visiblePracticeEvents.reduce<Map<string, { title: string; category: string; count: number }>>((result, event) => {
      const current = result.get(event.exerciseId);
      result.set(event.exerciseId, {
        title: event.title,
        category: event.category,
        count: (current?.count ?? 0) + 1,
      });
      return result;
    }, new Map());
    return [...totals.values()].sort((a, b) => b.count - a.count).slice(0, 4);
  }, [visiblePracticeEvents]);

  const hasHistory = entries.length > 0 || checkIns.length > 0;

  return (
    <View collapsable={false} style={styles.root}>
      <ImageBackground
        {...({ collapsable: false } as any)}
        source={require("../../../assets/welcome/paper-background.png")}
        resizeMode="cover"
        style={styles.background}
      >
        <SafeAreaView collapsable={false} style={styles.safeArea} edges={["top", "bottom"]}>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.content}
            refreshControl={(
              <RefreshControl
                onRefresh={() => void loadHistory(true)}
                refreshing={isRefreshing}
                tintColor="#673F3F"
              />
            )}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View>
                <Text style={styles.kicker}>Your Story</Text>
                <Text style={styles.title}>History</Text>
              </View>
              <Pressable
                accessibilityLabel={`Choose history period. Currently ${rangeLabel}`}
                accessibilityRole="button"
                onPress={() => setRangeOpen(true)}
                style={styles.calendarButton}
              >
                <CalendarDays color="#673F3F" size={22} strokeWidth={1.9} />
                <ChevronDown color="rgba(103,63,63,0.66)" size={14} strokeWidth={2.2} />
              </Pressable>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryIntro}>
                <Sparkles color="#9A5B6A" size={18} strokeWidth={2} />
                <Text style={styles.summaryLabel}>Your reflection rhythm</Text>
              </View>
              <Text style={styles.summaryTitle}>
                Small moments of noticing become a story you can return to.
              </Text>
              <View style={styles.metricsRow}>
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>{visibleEntries.length}</Text>
                  <Text style={styles.metricLabel}>Reflections</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>{visibleCheckIns.length}</Text>
                  <Text style={styles.metricLabel}>Check-in days</Text>
                </View>
              </View>
            </View>

            <Text style={styles.insightsKicker}>Weekly insights</Text>
            <View style={styles.trendCard}>
              <View style={styles.trendHeader}>
                <View style={styles.trendTitleGroup}>
                  <Text style={styles.trendTitle}>Nervous system trend</Text>
                  <Text style={styles.trendSubtitle}>{weeklyInsight.copy}</Text>
                </View>
                <View style={styles.weekBadge}>
                  <Text style={styles.weekBadgeText}>{range === "all" ? "Latest" : rangeLabel}</Text>
                </View>
              </View>
              <TrendChart days={trendDays} />
              <View style={styles.trendFooter}>
                <Text style={styles.trendFooterLabel}>Check-in rhythm</Text>
                <Text style={styles.trendFooterValue}>{weeklyInsight.checkInCount} of 7 days</Text>
              </View>
            </View>

            <View style={styles.practiceCard}>
              <View style={styles.trendHeader}>
                <View style={styles.trendTitleGroup}>
                  <Text style={styles.trendTitle}>Top exercises</Text>
                  <Text style={styles.trendSubtitle}>{rangeLabel}</Text>
                </View>
                <Text style={styles.practiceTotal}>{visiblePracticeEvents.length} completed</Text>
              </View>
              {topPractices.length === 0 ? (
                <View style={styles.practiceEmpty}>
                  <Text style={styles.practiceEmptyTitle}>No completed exercises yet</Text>
                  <Text style={styles.practiceEmptyText}>Finish a practice and your most-used exercises will grow here.</Text>
                </View>
              ) : (
                <View style={styles.practiceBars}>
                  {topPractices.map((practice, index) => {
                    const maximum = topPractices[0]?.count ?? 1;
                    return (
                      <View key={`${practice.title}-${practice.category}`} style={styles.practiceBarRow}>
                        <View style={styles.practiceRank}><Text style={styles.practiceRankText}>{index + 1}</Text></View>
                        <View style={styles.practiceBarCopy}>
                          <View style={styles.practiceLabelRow}>
                            <Text numberOfLines={1} style={styles.practiceName}>{practice.title}</Text>
                            <Text style={styles.practiceCount}>{practice.count}</Text>
                          </View>
                          <View style={styles.practiceTrack}>
                            <View style={[styles.practiceFill, { width: `${Math.max(12, (practice.count / maximum) * 100)}%` }]} />
                          </View>
                          <Text style={styles.practiceCategory}>{practice.category}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.filters}>
              {filters.map((item) => {
                const selected = filter === item.id;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={item.id}
                    onPress={() => setFilter(item.id)}
                    style={[styles.filterButton, selected && styles.filterButtonSelected]}
                  >
                    <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {isLoading ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Gathering your moments…</Text>
              </View>
            ) : groupedItems.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <BookOpenText color="#9A5B6A" size={25} strokeWidth={1.8} />
                </View>
                <Text style={styles.emptyTitle}>
                  {hasHistory ? "Nothing in this view yet" : "Your story starts here"}
                </Text>
                <Text style={styles.emptyBody}>
                  {hasHistory
                    ? "Choose another filter to revisit your saved moments."
                    : "Complete a daily check-in or save a journal reflection and it will appear here."}
                </Text>
              </View>
            ) : (
              <View style={styles.timeline}>
                {groupedItems.map((group) => (
                  <View key={group.date} style={styles.dayGroup}>
                    <View style={styles.dayHeader}>
                      <Text style={styles.dayLabel}>{formatGroupDate(group.date)}</Text>
                      <View style={styles.dayLine} />
                    </View>
                    <View style={styles.dayItems}>
                      {group.items.map((item) => item.kind === "journal" ? (
                        <View key={item.id} style={styles.historyCard}>
                          <View style={[styles.cardIcon, styles.journalIcon]}>
                            <BookOpenText color="#7A4552" size={20} strokeWidth={2} />
                          </View>
                          <View style={styles.cardContent}>
                            <View style={styles.cardTopRow}>
                              <Text style={styles.cardKind}>{item.entry.pack}</Text>
                              <Text style={styles.cardTime}>{formatTime(item.entry.createdAt)}</Text>
                            </View>
                            <Text numberOfLines={2} style={styles.cardPrompt}>{item.entry.prompt}</Text>
                            <Text numberOfLines={3} style={styles.cardBody}>{item.entry.text}</Text>
                          </View>
                        </View>
                      ) : (
                        <View key={item.id} style={styles.historyCard}>
                          <View style={[styles.cardIcon, styles.checkInIcon]}>
                            <HeartPulse color="#5D756D" size={21} strokeWidth={2} />
                          </View>
                          <View style={styles.cardContent}>
                            <View style={styles.cardTopRow}>
                              <Text style={styles.cardKind}>Daily check-in</Text>
                              <Text style={styles.cardTime}>{formatTime(item.checkIn.createdAt)}</Text>
                            </View>
                            <Text style={styles.checkInHeadline}>
                              Feeling {item.checkIn.answers.state.toLowerCase()}
                            </Text>
                            <View style={styles.answerRow}>
                              {[item.checkIn.answers.body, item.checkIn.answers.energy, item.checkIn.answers.support]
                                .filter(Boolean)
                                .map((answer) => (
                                  <View key={answer} style={styles.answerChip}>
                                    <Text style={styles.answerText}>{answer}</Text>
                                  </View>
                                ))}
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>
      <Modal animationType="fade" onRequestClose={() => setRangeOpen(false)} transparent visible={rangeOpen}>
        <Pressable onPress={() => setRangeOpen(false)} style={styles.rangeBackdrop}>
          <Pressable onPress={(event) => event.stopPropagation()} style={styles.rangeSheet}>
            <View style={styles.rangeHeader}>
              <View>
                <Text style={styles.rangeKicker}>History period</Text>
                <Text style={styles.rangeTitle}>Choose a date range</Text>
              </View>
              <Pressable accessibilityLabel="Close date range" hitSlop={8} onPress={() => setRangeOpen(false)} style={styles.rangeClose}>
                <X color="#673F3F" size={19} />
              </Pressable>
            </View>
            <View style={styles.rangeOptions}>
              {rangeOptions.map((option) => {
                const selected = option.id === range;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={option.id}
                    onPress={() => { setRange(option.id); setRangeOpen(false); }}
                    style={[styles.rangeOption, selected && styles.rangeOptionSelected]}
                  >
                    <View style={styles.rangeOptionCopy}>
                      <Text style={[styles.rangeOptionLabel, selected && styles.rangeOptionLabelSelected]}>{option.label}</Text>
                      <Text style={[styles.rangeOptionDescription, selected && styles.rangeOptionDescriptionSelected]}>{option.description}</Text>
                    </View>
                    {selected ? <Check color="#FFF8EE" size={18} strokeWidth={2.5} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6E3C5" },
  background: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "transparent" },
  content: { paddingHorizontal: screenLayout.horizontalPadding, paddingTop: screenLayout.topPadding, paddingBottom: 132 },
  header: {
    minHeight: screenLayout.headerHeight,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  kicker: {
    color: "#8A6C61",
    fontFamily: bodyFont,
    fontSize: typeScale.screenKicker,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 3,
    color: "#5F3B2B",
    fontFamily: bodyFont,
    fontSize: typeScale.screenTitle,
    lineHeight: typeScale.screenTitleLine,
    fontWeight: "700",
  },
  calendarButton: {
    minWidth: 76,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 23,
    backgroundColor: "rgba(255, 255, 255, 0.48)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.68)",
  },
  summaryCard: {
    marginTop: 14,
    borderRadius: 30,
    padding: 20,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.68)",
    shadowColor: "#5F3B2B",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  summaryIntro: { flexDirection: "row", alignItems: "center", gap: 8 },
  summaryLabel: {
    color: "#7A4552",
    fontFamily: bodyFont,
    fontSize: 13,
    fontWeight: "800",
  },
  summaryTitle: {
    marginTop: 15,
    color: "#5F3B2B",
    fontFamily: bodyFont,
    fontSize: typeScale.heroTitle,
    lineHeight: typeScale.heroTitleLine,
    fontWeight: "600",
    letterSpacing: -0.25,
  },
  metricsRow: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 22,
    backgroundColor: "rgba(246, 227, 197, 0.42)",
    paddingVertical: 14,
  },
  metric: { flex: 1, alignItems: "center" },
  metricDivider: { width: 1, height: 34, backgroundColor: "rgba(95, 59, 43, 0.12)" },
  metricValue: {
    color: "#5F3B2B",
    fontFamily: bodyFont,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "700",
  },
  metricLabel: {
    marginTop: 3,
    color: "rgba(95, 59, 43, 0.62)",
    fontFamily: bodyFont,
    fontSize: 12,
    fontWeight: "700",
  },
  insightsKicker: {
    marginTop: 28,
    color: "rgba(95,59,43,0.48)",
    fontFamily: bodyFont,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  trendCard: {
    marginTop: 11,
    borderRadius: 28,
    padding: 18,
    backgroundColor: "rgba(255,255,255,0.48)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.66)",
  },
  trendHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  trendTitleGroup: { minWidth: 0, flex: 1 },
  trendTitle: { color: "#5F3B2B", fontFamily: bodyFont, fontSize: typeScale.sectionTitle, lineHeight: typeScale.sectionTitleLine, fontWeight: "700" },
  trendSubtitle: { marginTop: 3, color: "rgba(95,59,43,0.54)", fontFamily: bodyFont, fontSize: 13, lineHeight: 18, fontWeight: "500" },
  weekBadge: { minHeight: 30, justifyContent: "center", borderRadius: 15, paddingHorizontal: 11, backgroundColor: "rgba(223,162,177,0.22)" },
  weekBadgeText: { color: "#7A4652", fontFamily: bodyFont, fontSize: 11, fontWeight: "700" },
  chartWrap: { marginTop: 14 },
  chartStage: { height: 132, justifyContent: "center" },
  chartEmpty: { position: "absolute", left: 36, right: 36, color: "rgba(95,59,43,0.42)", fontFamily: bodyFont, fontSize: 12, lineHeight: 18, fontWeight: "500", textAlign: "center" },
  chartLabels: { marginTop: -1, flexDirection: "row" },
  chartDay: { flex: 1, alignItems: "center", gap: 5 },
  rhythmDot: { width: 14, height: 14, alignItems: "center", justifyContent: "center", borderRadius: 7, borderWidth: 1.5, borderColor: "rgba(95,59,43,0.18)" },
  rhythmDotActive: { borderColor: "rgba(154,91,106,0.54)", backgroundColor: "rgba(223,162,177,0.2)" },
  rhythmDotCore: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#9A5B6A" },
  chartDayText: { color: "rgba(95,59,43,0.5)", fontFamily: bodyFont, fontSize: 10, fontWeight: "700" },
  trendFooter: { marginTop: 15, paddingTop: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(95,59,43,0.12)" },
  trendFooterLabel: { color: "#5F3B2B", fontFamily: bodyFont, fontSize: 12, fontWeight: "700" },
  trendFooterValue: { color: "rgba(95,59,43,0.52)", fontFamily: bodyFont, fontSize: 12, fontWeight: "600" },
  practiceCard: {
    marginTop: 12,
    borderRadius: 28,
    padding: 18,
    backgroundColor: "rgba(255,255,255,0.48)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.66)",
  },
  practiceTotal: { color: "rgba(95,59,43,0.48)", fontFamily: bodyFont, fontSize: 11, fontWeight: "700" },
  practiceEmpty: { minHeight: 128, alignItems: "center", justifyContent: "center", paddingHorizontal: 22 },
  practiceEmptyTitle: { color: "#5F3B2B", fontFamily: bodyFont, fontSize: 14, fontWeight: "700", textAlign: "center" },
  practiceEmptyText: { marginTop: 5, color: "rgba(95,59,43,0.5)", fontFamily: bodyFont, fontSize: 12, lineHeight: 18, fontWeight: "500", textAlign: "center" },
  practiceBars: { marginTop: 20, gap: 17 },
  practiceBarRow: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  practiceRank: { width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "rgba(223,162,177,0.24)" },
  practiceRankText: { color: "#7A4652", fontFamily: bodyFont, fontSize: 11, fontWeight: "700" },
  practiceBarCopy: { minWidth: 0, flex: 1 },
  practiceLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  practiceName: { flex: 1, color: "#3F302A", fontFamily: bodyFont, fontSize: typeScale.itemTitle, lineHeight: typeScale.itemTitleLine, fontWeight: "600" },
  practiceCount: { color: "#7A4652", fontFamily: bodyFont, fontSize: 12, fontWeight: "700" },
  practiceTrack: { height: 7, marginTop: 8, overflow: "hidden", borderRadius: 4, backgroundColor: "rgba(95,59,43,0.09)" },
  practiceFill: { height: 7, borderRadius: 4, backgroundColor: "#B66E7F" },
  practiceCategory: { marginTop: 5, color: "rgba(95,59,43,0.46)", fontFamily: bodyFont, fontSize: 10, fontWeight: "600" },
  filters: { marginTop: 22, flexDirection: "row", gap: 9 },
  filterButton: {
    minHeight: 43,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.43)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
  },
  filterButtonSelected: { backgroundColor: "#704445", borderColor: "#704445" },
  filterText: { color: "#704D40", fontFamily: bodyFont, fontSize: 13, fontWeight: "700" },
  filterTextSelected: { color: "#FFF5E5" },
  timeline: { marginTop: 28, gap: 28 },
  dayGroup: { gap: 12 },
  dayHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  dayLabel: {
    color: "#7B5B4E",
    fontFamily: bodyFont,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  dayLine: { flex: 1, height: 1, backgroundColor: "rgba(95, 59, 43, 0.12)" },
  dayItems: { gap: 11 },
  historyCard: {
    flexDirection: "row",
    gap: 14,
    borderRadius: 26,
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.48)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.62)",
  },
  cardIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 23,
  },
  journalIcon: { backgroundColor: "rgba(223, 162, 177, 0.25)" },
  checkInIcon: { backgroundColor: "rgba(169, 193, 179, 0.28)" },
  cardContent: { flex: 1, minWidth: 0 },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardKind: { flex: 1, color: "#3F302A", fontFamily: bodyFont, fontSize: 15, fontWeight: "600" },
  cardTime: { color: "rgba(95, 59, 43, 0.48)", fontFamily: bodyFont, fontSize: 11, fontWeight: "700" },
  cardPrompt: {
    marginTop: 8,
    color: "#5F3B2B",
    fontFamily: bodyFont,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
  },
  cardBody: {
    marginTop: 7,
    color: "rgba(95, 59, 43, 0.66)",
    fontFamily: bodyFont,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "500",
  },
  checkInHeadline: {
    marginTop: 8,
    color: "#5F3B2B",
    fontFamily: bodyFont,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
  },
  answerRow: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 7 },
  answerChip: { borderRadius: 13, backgroundColor: "rgba(246, 227, 197, 0.58)", paddingHorizontal: 9, paddingVertical: 5 },
  answerText: { color: "rgba(95, 59, 43, 0.68)", fontFamily: bodyFont, fontSize: 11, fontWeight: "700" },
  emptyCard: {
    marginTop: 28,
    minHeight: 210,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    padding: 28,
    backgroundColor: "rgba(255, 255, 255, 0.44)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
  },
  emptyIcon: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 27,
    backgroundColor: "rgba(223, 162, 177, 0.2)",
    marginBottom: 14,
  },
  emptyTitle: { color: "#5F3B2B", fontFamily: bodyFont, fontSize: 20, fontWeight: "700", textAlign: "center" },
  emptyBody: { marginTop: 8, color: "rgba(95, 59, 43, 0.6)", fontFamily: bodyFont, fontSize: 14, lineHeight: 21, fontWeight: "500", textAlign: "center" },
  rangeBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(44,29,24,0.28)", padding: 12 },
  rangeSheet: {
    borderRadius: 30,
    padding: 20,
    paddingBottom: 28,
    backgroundColor: "#FFF8EE",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.76)",
    shadowColor: "#3E2821",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 12,
  },
  rangeHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 },
  rangeKicker: { color: "rgba(95,59,43,0.48)", fontFamily: bodyFont, fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  rangeTitle: { marginTop: 4, color: "#5F3B2B", fontFamily: bodyFont, fontSize: 20, fontWeight: "700" },
  rangeClose: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 19, backgroundColor: "rgba(103,63,63,0.08)" },
  rangeOptions: { marginTop: 18, gap: 9 },
  rangeOption: { minHeight: 67, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "rgba(246,227,197,0.42)", borderWidth: 1, borderColor: "rgba(95,59,43,0.06)" },
  rangeOptionSelected: { backgroundColor: "#704445", borderColor: "#704445" },
  rangeOptionCopy: { minWidth: 0, flex: 1 },
  rangeOptionLabel: { color: "#5F3B2B", fontFamily: bodyFont, fontSize: 14, fontWeight: "700" },
  rangeOptionLabelSelected: { color: "#FFF8EE" },
  rangeOptionDescription: { marginTop: 3, color: "rgba(95,59,43,0.52)", fontFamily: bodyFont, fontSize: 11, fontWeight: "500" },
  rangeOptionDescriptionSelected: { color: "rgba(255,248,238,0.68)" },
});
