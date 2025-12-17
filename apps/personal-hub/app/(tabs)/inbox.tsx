import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput } from 'react-native';

import { Text, View } from '@/components/Themed';
import { nowIso } from '@/lib/dates';
import { parseQuickCapture } from '@/lib/parse';
import { useAppStore } from '@/lib/store';
import type { BillCadence, QuickCaptureKind } from '@/lib/types';

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

export default function InboxScreen() {
  const activeHouseholdId = useAppStore((s) => s.activeHouseholdId);
  const activeMemberId = useAppStore((s) => s.activeMemberId);

  const lists = useAppStore((s) => s.lists);
  const categories = useAppStore((s) => s.categories);

  const createTask = useAppStore((s) => s.createTask);
  const addListItem = useAppStore((s) => s.addListItem);
  const createTransaction = useAppStore((s) => s.createTransaction);
  const createBill = useAppStore((s) => s.createBill);

  const [kind, setKind] = useState<QuickCaptureKind>('task');
  const [text, setText] = useState('');

  const parsed = useMemo(() => (text.trim().length ? parseQuickCapture(text) : undefined), [text]);

  const householdLists = useMemo(
    () => Object.values(lists).filter((l) => l.householdId === activeHouseholdId && !l.archived),
    [lists, activeHouseholdId]
  );

  const expenseCategories = useMemo(
    () =>
      Object.values(categories)
        .filter((c) => c.householdId === activeHouseholdId && c.kind === 'expense' && !c.archived)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categories, activeHouseholdId]
  );

  const incomeCategories = useMemo(
    () =>
      Object.values(categories)
        .filter((c) => c.householdId === activeHouseholdId && c.kind === 'income' && !c.archived)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categories, activeHouseholdId]
  );

  const [selectedListId, setSelectedListId] = useState<string | undefined>(undefined);
  const [txnAmount, setTxnAmount] = useState<string>('');
  const [txnCategoryId, setTxnCategoryId] = useState<string | undefined>(undefined);
  const [txnNotes, setTxnNotes] = useState<string>('');

  const [billAmount, setBillAmount] = useState<string>('');
  const [billCadence, setBillCadence] = useState<BillCadence>('monthly');
  const [billNextDue, setBillNextDue] = useState<string>('');

  const hintedCategoryId = useMemo(() => {
    if (!parsed?.categoryNameHint) return undefined;
    const hint = parsed.categoryNameHint.toLowerCase();
    return expenseCategories.find((c) => c.name.toLowerCase() === hint)?.id;
  }, [parsed?.categoryNameHint, expenseCategories]);

  const hintedAmount = parsed?.amount;
  const hintedDueAt = parsed?.dueAt;

  const canSubmit = text.trim().length > 0 && !!activeHouseholdId;

  function reset() {
    setText('');
    setTxnAmount('');
    setTxnCategoryId(undefined);
    setTxnNotes('');
    setBillAmount('');
    setBillCadence('monthly');
    setBillNextDue('');
  }

  function submit() {
    if (!canSubmit) return;

    const title = text.trim();

    if (kind === 'task') {
      createTask({ title, dueAt: hintedDueAt, assignedToMemberId: activeMemberId });
      reset();
      return;
    }

    if (kind === 'list_item') {
      const listId = selectedListId ?? householdLists[0]?.id;
      if (!listId) return;
      addListItem({ listId, title, addedByMemberId: activeMemberId });
      reset();
      return;
    }

    if (kind === 'transaction') {
      const amount = toNumber(txnAmount) ?? (typeof hintedAmount === 'number' ? hintedAmount : undefined);
      if (amount === undefined) return;
      const categoryId = txnCategoryId ?? hintedCategoryId ?? expenseCategories[0]?.id ?? incomeCategories[0]?.id;
      if (!categoryId) return;
      createTransaction({
        amount,
        categoryId,
        occurredAt: nowIso(),
        notes: txnNotes.trim() || undefined,
        createdByMemberId: activeMemberId,
      });
      reset();
      return;
    }

    if (kind === 'bill') {
      const amount = toNumber(billAmount) ?? (typeof hintedAmount === 'number' ? hintedAmount : undefined);
      if (amount === undefined) return;
      const nextDueAt = (billNextDue.trim().length ? new Date(billNextDue.trim()) : hintedDueAt ? new Date(hintedDueAt) : new Date());
      const nextDueIso = new Date(nextDueAt.getFullYear(), nextDueAt.getMonth(), nextDueAt.getDate()).toISOString();
      createBill({
        name: title,
        amount,
        cadence: billCadence,
        nextDueAt: nextDueIso,
        categoryId: txnCategoryId ?? hintedCategoryId,
      });
      reset();
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inbox</Text>
      <Text style={styles.subtitle}>Capture first. Sort later.</Text>

      <View style={styles.chipRow}>
        <Chip title="Task" selected={kind === 'task'} onPress={() => setKind('task')} />
        <Chip title="List item" selected={kind === 'list_item'} onPress={() => setKind('list_item')} />
        <Chip title="Expense/Income" selected={kind === 'transaction'} onPress={() => setKind('transaction')} />
        <Chip title="Bill" selected={kind === 'bill'} onPress={() => setKind('bill')} />
      </View>

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={
          kind === 'transaction'
            ? 'e.g. Groceries $42 #groceries'
            : kind === 'bill'
              ? 'e.g. Rent $1200 on 1/1'
              : kind === 'list_item'
                ? 'e.g. Milk, eggs, detergent'
                : 'e.g. Book dentist tomorrow'
        }
        style={styles.input}
        autoCapitalize="sentences"
        autoCorrect
        returnKeyType="done"
        onSubmitEditing={submit}
        blurOnSubmit={false}
      />

      {kind === 'list_item' ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Add to list</Text>
          <View style={styles.chipRow}>
            {householdLists.map((l) => (
              <Chip key={l.id} title={l.name} selected={(selectedListId ?? householdLists[0]?.id) === l.id} onPress={() => setSelectedListId(l.id)} />
            ))}
          </View>
        </View>
      ) : null}

      {kind === 'transaction' ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Money details</Text>
          <TextInput
            value={txnAmount}
            onChangeText={setTxnAmount}
            placeholder={typeof hintedAmount === 'number' ? `Amount (hint: ${hintedAmount})` : 'Amount (use negative for expense)'}
            keyboardType={Platform.select({ ios: 'decimal-pad', android: 'numeric', default: 'numeric' })}
            style={styles.input}
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.chipRow}>
            {[...expenseCategories.slice(0, 6), ...incomeCategories.slice(0, 2)].map((c) => (
              <Chip
                key={c.id}
                title={c.name}
                selected={(txnCategoryId ?? hintedCategoryId) === c.id}
                onPress={() => setTxnCategoryId(c.id)}
              />
            ))}
          </View>

          <TextInput
            value={txnNotes}
            onChangeText={setTxnNotes}
            placeholder="Notes (optional)"
            style={styles.input}
          />
        </View>
      ) : null}

      {kind === 'bill' ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Bill details</Text>
          <TextInput
            value={billAmount}
            onChangeText={setBillAmount}
            placeholder={typeof hintedAmount === 'number' ? `Amount (hint: ${hintedAmount})` : 'Amount'}
            keyboardType={Platform.select({ ios: 'decimal-pad', android: 'numeric', default: 'numeric' })}
            style={styles.input}
          />

          <Text style={styles.label}>Cadence</Text>
          <View style={styles.chipRow}>
            {(['monthly', 'weekly', 'yearly', 'one_time'] as BillCadence[]).map((c) => (
              <Chip key={c} title={c.replace('_', ' ')} selected={billCadence === c} onPress={() => setBillCadence(c)} />
            ))}
          </View>

          <TextInput
            value={billNextDue}
            onChangeText={setBillNextDue}
            placeholder={
              hintedDueAt
                ? `Next due (YYYY-MM-DD) (hinted)`
                : 'Next due (YYYY-MM-DD)'
            }
            style={styles.input}
          />

          <Text style={styles.hint}>Tip: you can type “on 12/31”, “tomorrow”, or “#groceries” in the capture field.</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button title={canSubmit ? 'Add' : 'Add (set active household)'} onPress={submit} />
        <Button title="Clear" onPress={reset} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { opacity: 0.7 },
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
  panel: {
    borderWidth: 1,
    borderColor: 'rgba(120,120,120,0.25)',
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  panelTitle: { fontWeight: '700' },
  label: { opacity: 0.75, fontSize: 12 },
  hint: { opacity: 0.65, fontSize: 12, lineHeight: 16 },
  actions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  button: {
    backgroundColor: 'rgba(0,122,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  buttonText: { fontWeight: '700' },
});
