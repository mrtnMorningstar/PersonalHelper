import React, { useMemo, useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useAppStore } from '@/lib/store';

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function Button({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}> 
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

export default function ListsScreen() {
  const activeHouseholdId = useAppStore((s) => s.activeHouseholdId);
  const lists = useAppStore((s) => s.lists);
  const listItems = useAppStore((s) => s.listItems);
  const createList = useAppStore((s) => s.createList);

  const [newListName, setNewListName] = useState('');

  const householdLists = useMemo(
    () =>
      Object.values(lists)
        .filter((l) => l.householdId === activeHouseholdId && !l.archived)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [lists, activeHouseholdId]
  );

  const openCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const it of Object.values(listItems)) {
      if (it.householdId !== activeHouseholdId) continue;
      if (it.status !== 'open') continue;
      counts[it.listId] = (counts[it.listId] ?? 0) + 1;
    }
    return counts;
  }, [listItems, activeHouseholdId]);

  function addList() {
    const name = newListName.trim();
    if (!name) return;
    createList(name);
    setNewListName('');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Lists</Text>
        <Link href="/(tabs)/inbox" asChild>
          <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && { opacity: 0.75 }]}> 
            <Text style={styles.secondaryButtonText}>Add items</Text>
          </Pressable>
        </Link>
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Create a list</Text>
        <View style={styles.row}>
          <TextInput value={newListName} onChangeText={setNewListName} placeholder="e.g. Camping" style={styles.input} />
          <Button title="Create" onPress={addList} />
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Your lists</Text>
        {householdLists.length === 0 ? <Text style={styles.muted}>No lists yet.</Text> : null}
        {householdLists.map((l) => (
          <Link key={l.id} href={{ pathname: '/list/[id]', params: { id: l.id } }} asChild>
            <Pressable style={({ pressed }) => [styles.listRow, pressed && { opacity: 0.75 }]}> 
              <Text style={styles.listName}>{l.name}</Text>
              <Text style={styles.mutedSmall}>{openCounts[l.id] ?? 0} open</Text>
            </Pressable>
          </Link>
        ))}
      </Card>
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
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: {
    flex: 1,
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
  },
  buttonText: { fontWeight: '700' },
  listRow: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(120,120,120,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listName: { fontSize: 14, fontWeight: '700' },
});
