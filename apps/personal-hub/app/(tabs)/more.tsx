import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { format, parseISO } from 'date-fns';

import { Text, View } from '@/components/Themed';
import { useAppStore } from '@/lib/store';

function Button({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}> 
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export default function MoreScreen() {
  const activeHouseholdId = useAppStore((s) => s.activeHouseholdId);
  const activeMemberId = useAppStore((s) => s.activeMemberId);

  const households = useAppStore((s) => s.households);
  const members = useAppStore((s) => s.members);
  const tasks = useAppStore((s) => s.tasks);
  const lists = useAppStore((s) => s.lists);
  const listItems = useAppStore((s) => s.listItems);
  const bills = useAppStore((s) => s.bills);
  const transactions = useAppStore((s) => s.transactions);
  const categories = useAppStore((s) => s.categories);

  const setActiveHousehold = useAppStore((s) => s.setActiveHousehold);
  const createHousehold = useAppStore((s) => s.createHousehold);
  const addMember = useAppStore((s) => s.addMember);
  const toggleTaskDone = useAppStore((s) => s.toggleTaskDone);
  const toggleListItemDone = useAppStore((s) => s.toggleListItemDone);
  const markBillPaid = useAppStore((s) => s.markBillPaid);

  const [q, setQ] = useState('');
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [newMemberName, setNewMemberName] = useState('');

  const householdMembers = useMemo(
    () => Object.values(members).filter((m) => m.householdId === activeHouseholdId),
    [members, activeHouseholdId]
  );

  const activeMember = activeMemberId ? members[activeMemberId] : undefined;
  const activeHousehold = activeHouseholdId ? households[activeHouseholdId] : undefined;

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle || !activeHouseholdId) return { tasks: [], listItems: [], bills: [], transactions: [] };

    const taskRes = Object.values(tasks).filter(
      (t) => t.householdId === activeHouseholdId && (t.title.toLowerCase().includes(needle) || (t.notes ?? '').toLowerCase().includes(needle))
    );
    const listRes = Object.values(listItems).filter(
      (it) => it.householdId === activeHouseholdId && it.title.toLowerCase().includes(needle)
    );
    const billRes = Object.values(bills).filter(
      (b) => b.householdId === activeHouseholdId && b.name.toLowerCase().includes(needle)
    );
    const txnRes = Object.values(transactions).filter((t) => {
      if (t.householdId !== activeHouseholdId) return false;
      const cat = categories[t.categoryId]?.name ?? '';
      const notes = t.notes ?? '';
      return cat.toLowerCase().includes(needle) || notes.toLowerCase().includes(needle);
    });

    return {
      tasks: taskRes.slice(0, 10),
      listItems: listRes.slice(0, 10),
      bills: billRes.slice(0, 10),
      transactions: txnRes.slice(0, 10),
    };
  }, [q, activeHouseholdId, tasks, listItems, bills, transactions, categories]);

  function createNewHousehold() {
    const name = newHouseholdName.trim();
    if (!name) return;
    const hhId = createHousehold(name);
    addMember(hhId, 'You', 'owner');
    setActiveHousehold(hhId);
    setNewHouseholdName('');
  }

  function addNewMember() {
    if (!activeHouseholdId) return;
    const name = newMemberName.trim();
    if (!name) return;
    addMember(activeHouseholdId, name, 'member');
    setNewMemberName('');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>More</Text>

      <Card>
        <Text style={styles.sectionTitle}>Search</Text>
        <TextInput value={q} onChangeText={setQ} placeholder="Search tasks, lists, bills, transactions" style={styles.input} />

        {q.trim().length ? (
          <View style={{ gap: 10 }}>
            <View style={styles.resultGroup}>
              <Text style={styles.groupTitle}>Tasks</Text>
              {results.tasks.length === 0 ? <Text style={styles.muted}>No matches.</Text> : null}
              {results.tasks.map((t) => (
                <Pressable key={t.id} onPress={() => toggleTaskDone(t.id)} style={({ pressed }) => [styles.resultRow, pressed && { opacity: 0.75 }]}> 
                  <Text style={styles.resultTitle}>{t.status === 'done' ? '☑' : '☐'} {t.title}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.resultGroup}>
              <Text style={styles.groupTitle}>List items</Text>
              {results.listItems.length === 0 ? <Text style={styles.muted}>No matches.</Text> : null}
              {results.listItems.map((it) => (
                <Pressable key={it.id} onPress={() => toggleListItemDone(it.id)} style={({ pressed }) => [styles.resultRow, pressed && { opacity: 0.75 }]}> 
                  <Text style={styles.resultTitle}>{it.status === 'done' ? '☑' : '☐'} {it.title}</Text>
                  <Text style={styles.mutedSmall}>{lists[it.listId]?.name ?? 'List'}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.resultGroup}>
              <Text style={styles.groupTitle}>Bills</Text>
              {results.bills.length === 0 ? <Text style={styles.muted}>No matches.</Text> : null}
              {results.bills.map((b) => (
                <Pressable key={b.id} onPress={() => markBillPaid(b.id)} style={({ pressed }) => [styles.resultRow, pressed && { opacity: 0.75 }]}> 
                  <Text style={styles.resultTitle}>{b.name} · ${b.amount.toFixed(2)}</Text>
                  <Text style={styles.mutedSmall}>Next {format(parseISO(b.nextDueAt), 'MMM d')} (tap to mark paid)</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.resultGroup}>
              <Text style={styles.groupTitle}>Transactions</Text>
              {results.transactions.length === 0 ? <Text style={styles.muted}>No matches.</Text> : null}
              {results.transactions.map((t) => (
                <View key={t.id} style={styles.resultRow}>
                  <Text style={styles.resultTitle}>{categories[t.categoryId]?.name ?? 'Category'} · {t.amount.toFixed(2)}</Text>
                  <Text style={styles.mutedSmall}>{format(parseISO(t.occurredAt), 'MMM d')} {t.notes ? `· ${t.notes}` : ''}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Text style={styles.muted}>Type to search across your household.</Text>
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Household</Text>
        <Text style={styles.mutedSmall}>Active: {activeHousehold?.name ?? '—'} · You: {activeMember?.displayName ?? '—'}</Text>

        <Text style={styles.groupTitle}>Switch household</Text>
        <View style={styles.chipRow}>
          {Object.values(households).map((h) => (
            <Pressable
              key={h.id}
              onPress={() => setActiveHousehold(h.id)}
              style={({ pressed }) => [styles.chip, h.id === activeHouseholdId && styles.chipSelected, pressed && { opacity: 0.85 }]}>
              <Text style={[styles.chipText, h.id === activeHouseholdId && styles.chipTextSelected]}>{h.name}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.inlineRow}>
          <TextInput value={newHouseholdName} onChangeText={setNewHouseholdName} placeholder="New household name" style={styles.input} />
          <Button title="Create" onPress={createNewHousehold} />
        </View>

        <Text style={styles.groupTitle}>Members</Text>
        {householdMembers.map((m) => (
          <Text key={m.id} style={styles.mutedSmall}>
            - {m.displayName} ({m.role})
          </Text>
        ))}

        <View style={styles.inlineRow}>
          <TextInput value={newMemberName} onChangeText={setNewMemberName} placeholder="Add member" style={styles.input} />
          <Button title="Add" onPress={addNewMember} />
        </View>

        <Text style={styles.mutedSmall}>
          Note: in this first version, “household sharing” is on-device (good offline). Next step is adding cloud sync so household members share across devices.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(120,120,120,0.25)',
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  sectionTitle: { fontWeight: '700' },
  groupTitle: { fontWeight: '700', marginTop: 6 },
  muted: { opacity: 0.7 },
  mutedSmall: { opacity: 0.65, fontSize: 12 },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(120,120,120,0.35)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    backgroundColor: 'rgba(0,122,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { fontWeight: '700' },
  inlineRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  resultGroup: { gap: 6 },
  resultRow: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(120,120,120,0.08)',
    gap: 2,
  },
  resultTitle: { fontWeight: '600' },
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
});
