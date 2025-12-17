import React, { useMemo } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { parseISO } from 'date-fns';

import { Text, View } from '@/components/Themed';
import { isDueToday, isOverdue, isUpcomingWithinDays } from '@/lib/dates';
import { useAppStore } from '@/lib/store';

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function RowAction({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <Text style={styles.rowTitle}>{title}</Text>
    </Pressable>
  );
}

export default function TodayScreen() {
  const activeHouseholdId = useAppStore((s) => s.activeHouseholdId);
  const tasks = useAppStore((s) => s.tasks);
  const bills = useAppStore((s) => s.bills);
  const toggleTaskDone = useAppStore((s) => s.toggleTaskDone);
  const markBillPaid = useAppStore((s) => s.markBillPaid);

  const { overdueTasks, todayTasks, upcomingTasks } = useMemo(() => {
    const open = Object.values(tasks).filter((t) => t.householdId === activeHouseholdId && t.status === 'open');
    open.sort((a, b) => {
      const ad = a.dueAt ? parseISO(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
      const bd = b.dueAt ? parseISO(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
      return ad - bd;
    });
    return {
      overdueTasks: open.filter((t) => isOverdue(t.dueAt)),
      todayTasks: open.filter((t) => isDueToday(t.dueAt)),
      upcomingTasks: open.filter((t) => t.dueAt && isUpcomingWithinDays(t.dueAt, 7) && !isDueToday(t.dueAt) && !isOverdue(t.dueAt)),
    };
  }, [tasks, activeHouseholdId]);

  const upcomingBills = useMemo(() => {
    return Object.values(bills)
      .filter((b) => b.householdId === activeHouseholdId && !b.archived)
      .filter((b) => isUpcomingWithinDays(b.nextDueAt, 30))
      .sort((a, b) => parseISO(a.nextDueAt).getTime() - parseISO(b.nextDueAt).getTime());
  }, [bills, activeHouseholdId]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Today</Text>
        <Link href="/(tabs)/inbox" asChild>
          <Pressable style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.75 }]}>
            <Text style={styles.primaryButtonText}>Capture</Text>
          </Pressable>
        </Link>
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Overdue</Text>
        {overdueTasks.length === 0 ? (
          <Text style={styles.muted}>Nothing overdue.</Text>
        ) : (
          overdueTasks.slice(0, 8).map((t) => (
            <RowAction key={t.id} title={`☐ ${t.title}`} onPress={() => toggleTaskDone(t.id)} />
          ))
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Due today</Text>
        {todayTasks.length === 0 ? (
          <Text style={styles.muted}>No tasks due today.</Text>
        ) : (
          todayTasks.slice(0, 10).map((t) => (
            <RowAction key={t.id} title={`☐ ${t.title}`} onPress={() => toggleTaskDone(t.id)} />
          ))
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Upcoming (7 days)</Text>
        {upcomingTasks.length === 0 ? (
          <Text style={styles.muted}>No upcoming tasks.</Text>
        ) : (
          upcomingTasks.slice(0, 10).map((t) => (
            <RowAction key={t.id} title={`☐ ${t.title}`} onPress={() => toggleTaskDone(t.id)} />
          ))
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Upcoming payments (30 days)</Text>
        {upcomingBills.length === 0 ? (
          <Text style={styles.muted}>No bills coming up.</Text>
        ) : (
          upcomingBills.slice(0, 10).map((b) => (
            <Pressable
              key={b.id}
              onPress={() => markBillPaid(b.id)}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
              <Text style={styles.rowTitle}>
                {b.name} · ${b.amount.toFixed(2)}
              </Text>
              <Text style={styles.mutedSmall}>Tap to mark paid</Text>
            </Pressable>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: '700' },
  primaryButton: {
    backgroundColor: 'rgba(0,122,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryButtonText: { fontWeight: '700' },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(120,120,120,0.25)',
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  sectionTitle: { fontWeight: '700' },
  muted: { opacity: 0.7 },
  mutedSmall: { opacity: 0.65, fontSize: 12 },
  row: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(120,120,120,0.08)',
    gap: 4,
  },
  rowTitle: { fontSize: 14, fontWeight: '600' },
});
