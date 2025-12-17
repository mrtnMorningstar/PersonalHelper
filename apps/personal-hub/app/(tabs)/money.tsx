import React, { useMemo, useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { addMonths, format, parseISO, startOfMonth } from 'date-fns';

import { Text, View } from '@/components/Themed';
import { monthKey, nowIso } from '@/lib/dates';
import { useAppStore } from '@/lib/store';

function Button({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}> 
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

function Chip({ title, selected, onPress }: { title: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && { opacity: 0.85 }]}> 
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{title}</Text>
    </Pressable>
  );
}

function toNumber(value: string): number | undefined {
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

export default function MoneyScreen() {
  const activeHouseholdId = useAppStore((s) => s.activeHouseholdId);
  const activeMemberId = useAppStore((s) => s.activeMemberId);

  const categories = useAppStore((s) => s.categories);
  const transactions = useAppStore((s) => s.transactions);
  const budgets = useAppStore((s) => s.budgets);
  const bills = useAppStore((s) => s.bills);

  const createTransaction = useAppStore((s) => s.createTransaction);
  const upsertBudget = useAppStore((s) => s.upsertBudget);
  const markBillPaid = useAppStore((s) => s.markBillPaid);

  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()));
  const month = monthKey(monthDate);

  const expenseCategories = useMemo(
    () =>
      Object.values(categories)
        .filter((c) => c.householdId === activeHouseholdId && c.kind === 'expense' && !c.archived)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categories, activeHouseholdId]
  );

  const txnsInMonth = useMemo(() => {
    const start = startOfMonth(monthDate);
    const startMs = start.getTime();
    const endMs = addMonths(start, 1).getTime();

    return Object.values(transactions)
      .filter((t) => t.householdId === activeHouseholdId)
      .filter((t) => {
        const ms = parseISO(t.occurredAt).getTime();
        return ms >= startMs && ms < endMs;
      });
  }, [transactions, activeHouseholdId, monthDate]);

  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of txnsInMonth) {
      map[t.categoryId] = (map[t.categoryId] ?? 0) + t.amount;
    }
    return map;
  }, [txnsInMonth]);

  const budgetByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of Object.values(budgets)) {
      if (b.householdId !== activeHouseholdId) continue;
      if (b.month !== month) continue;
      map[b.categoryId] = b.plannedAmount;
    }
    return map;
  }, [budgets, activeHouseholdId, month]);

  const totalSpent = useMemo(() => {
    // expenses are typically negative if entered that way
    return txnsInMonth.reduce((sum, t) => sum + t.amount, 0);
  }, [txnsInMonth]);

  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);

  function addTxn() {
    const a = toNumber(amount);
    if (a === undefined) return;
    const cat = categoryId ?? expenseCategories[0]?.id;
    if (!cat) return;
    createTransaction({ amount: a, categoryId: cat, occurredAt: nowIso(), notes: notes.trim() || undefined, createdByMemberId: activeMemberId });
    setAmount('');
    setNotes('');
  }

  const visibleBills = useMemo(
    () =>
      Object.values(bills)
        .filter((b) => b.householdId === activeHouseholdId && !b.archived)
        .sort((a, b) => parseISO(a.nextDueAt).getTime() - parseISO(b.nextDueAt).getTime())
        .slice(0, 8),
    [bills, activeHouseholdId]
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Money</Text>
        <Link href="/(tabs)/inbox" asChild>
          <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && { opacity: 0.75 }]}> 
            <Text style={styles.secondaryButtonText}>Capture</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.monthRow}>
        <Button title="◀" onPress={() => setMonthDate((d) => startOfMonth(addMonths(d, -1)))} />
        <Text style={styles.monthTitle}>{format(monthDate, 'MMMM yyyy')}</Text>
        <Button title="▶" onPress={() => setMonthDate((d) => startOfMonth(addMonths(d, 1)))} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Quick transaction</Text>
        <Text style={styles.muted}>Use negative amounts for expenses (e.g. -42.50).</Text>
        <TextInput value={amount} onChangeText={setAmount} placeholder="Amount" style={styles.input} keyboardType="numeric" />
        <Text style={styles.label}>Category</Text>
        <View style={styles.chipRow}>
          {expenseCategories.slice(0, 10).map((c) => (
            <Chip key={c.id} title={c.name} selected={(categoryId ?? expenseCategories[0]?.id) === c.id} onPress={() => setCategoryId(c.id)} />
          ))}
        </View>
        <TextInput value={notes} onChangeText={setNotes} placeholder="Notes (optional)" style={styles.input} />
        <View style={styles.actionsRow}>
          <Button title="Add" onPress={addTxn} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Budget ({month})</Text>
        <Text style={styles.muted}>Total (income+expenses): {totalSpent.toFixed(2)}</Text>

        {expenseCategories.length === 0 ? <Text style={styles.muted}>No categories yet.</Text> : null}

        {expenseCategories.map((c) => {
          const planned = budgetByCategory[c.id] ?? 0;
          const spent = spentByCategory[c.id] ?? 0;
          return (
            <View key={c.id} style={styles.budgetRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.budgetName}>{c.name}</Text>
                <Text style={styles.mutedSmall}>Planned: {planned.toFixed(2)} · Actual: {spent.toFixed(2)}</Text>
              </View>
              <Pressable
                onPress={() => {
                  const next = planned === 0 ? 100 : 0;
                  upsertBudget({ month, categoryId: c.id, plannedAmount: next });
                }}
                style={({ pressed }) => [styles.inlineButton, pressed && { opacity: 0.7 }]}>
                <Text style={styles.inlineButtonText}>{planned === 0 ? 'Set $100' : 'Clear'}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Bills</Text>
        {visibleBills.length === 0 ? <Text style={styles.muted}>No bills yet.</Text> : null}
        {visibleBills.map((b) => (
          <Pressable
            key={b.id}
            onPress={() => markBillPaid(b.id)}
            style={({ pressed }) => [styles.billRow, pressed && { opacity: 0.75 }]}>
            <Text style={styles.billName}>{b.name}</Text>
            <Text style={styles.mutedSmall}>${b.amount.toFixed(2)} · next {format(parseISO(b.nextDueAt), 'MMM d')}</Text>
          </Pressable>
        ))}
        <Text style={styles.mutedSmall}>Tap a bill to mark it paid (advances the next due date).</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: 'rgba(120,120,120,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  secondaryButtonText: { fontWeight: '700' },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthTitle: { fontSize: 16, fontWeight: '700' },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(120,120,120,0.25)',
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  sectionTitle: { fontWeight: '700' },
  muted: { opacity: 0.7 },
  mutedSmall: { opacity: 0.65, fontSize: 12 },
  label: { opacity: 0.75, fontSize: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: 'rgba(120,120,120,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipSelected: { backgroundColor: 'rgba(0,122,255,0.15)', borderColor: 'rgba(0,122,255,0.35)' },
  chipText: { fontSize: 13 },
  chipTextSelected: { fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(120,120,120,0.35)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionsRow: { flexDirection: 'row', gap: 10 },
  button: {
    backgroundColor: 'rgba(0,122,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 44,
    alignItems: 'center',
  },
  buttonText: { fontWeight: '700' },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  budgetName: { fontWeight: '700' },
  inlineButton: {
    backgroundColor: 'rgba(0,122,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  inlineButtonText: { fontWeight: '700', fontSize: 12 },
  billRow: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(120,120,120,0.08)',
    gap: 4,
  },
  billName: { fontWeight: '700' },
});
