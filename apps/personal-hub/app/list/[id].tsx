import React, { useMemo, useState } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useAppStore } from '@/lib/store';

function Button({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}> 
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

export default function ListDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const listId = params.id;

  const list = useAppStore((s) => (listId ? s.lists[listId] : undefined));
  const items = useAppStore((s) => s.listItems);
  const activeMemberId = useAppStore((s) => s.activeMemberId);

  const addListItem = useAppStore((s) => s.addListItem);
  const toggleListItemDone = useAppStore((s) => s.toggleListItemDone);

  const [title, setTitle] = useState('');

  const listItems = useMemo(() => {
    if (!list) return [];
    return Object.values(items)
      .filter((it) => it.listId === list.id && it.status !== 'archived')
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
        return a.createdAt.localeCompare(b.createdAt);
      });
  }, [items, list]);

  function add() {
    if (!list) return;
    const t = title.trim();
    if (!t) return;
    addListItem({ listId: list.id, title: t, addedByMemberId: activeMemberId });
    setTitle('');
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: list?.name ?? 'List' }} />
      <ScrollView contentContainerStyle={styles.container}>
        {!list ? <Text style={styles.muted}>List not found.</Text> : null}

        {list ? (
          <View style={styles.addRow}>
            <TextInput value={title} onChangeText={setTitle} placeholder="Add an item" style={styles.input} onSubmitEditing={add} />
            <Button title="Add" onPress={add} />
          </View>
        ) : null}

        {listItems.map((it) => (
          <Pressable
            key={it.id}
            onPress={() => toggleListItemDone(it.id)}
            style={({ pressed }) => [styles.itemRow, pressed && { opacity: 0.75 }]}>
            <Text style={styles.itemTitle}>{it.status === 'done' ? '☑' : '☐'} {it.title}</Text>
          </Pressable>
        ))}

        {list && listItems.length === 0 ? <Text style={styles.muted}>No items yet.</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  muted: { opacity: 0.7 },
  addRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
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
  itemRow: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(120,120,120,0.08)',
  },
  itemTitle: { fontSize: 14, fontWeight: '600' },
});
