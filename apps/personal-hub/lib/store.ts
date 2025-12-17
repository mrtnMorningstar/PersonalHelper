import AsyncStorage from '@react-native-async-storage/async-storage';
import { addMonths, addWeeks, addYears, parseISO } from 'date-fns';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { nowIso } from '@/lib/dates';
import { createId } from '@/lib/id';
import type { Bill, Budget, Category, Household, HouseholdMember, List, ListItem, Task, Transaction } from '@/lib/types';

type Entities<T> = Record<string, T>;

export type AppState = {
  version: 1;

  hasHydrated: boolean;

  activeHouseholdId?: string;
  activeMemberId?: string;

  households: Entities<Household>;
  members: Entities<HouseholdMember>;

  tasks: Entities<Task>;
  lists: Entities<List>;
  listItems: Entities<ListItem>;

  categories: Entities<Category>;
  budgets: Entities<Budget>;
  transactions: Entities<Transaction>;
  bills: Entities<Bill>;

  setHasHydrated: (value: boolean) => void;
  bootstrap: () => void;

  setActiveHousehold: (householdId: string) => void;
  createHousehold: (name: string) => string;
  addMember: (householdId: string, displayName: string, role?: HouseholdMember['role']) => string;

  createTask: (input: { title: string; dueAt?: string; notes?: string; assignedToMemberId?: string }) => string;
  toggleTaskDone: (taskId: string) => void;

  createList: (name: string) => string;
  addListItem: (input: { listId: string; title: string; quantity?: string; addedByMemberId?: string }) => string;
  toggleListItemDone: (itemId: string) => void;

  createCategory: (input: { name: string; kind: Category['kind'] }) => string;

  upsertBudget: (input: { month: string; categoryId: string; plannedAmount: number }) => string;

  createTransaction: (input: {
    amount: number;
    categoryId: string;
    occurredAt: string;
    notes?: string;
    createdByMemberId?: string;
  }) => string;

  createBill: (input: {
    name: string;
    amount: number;
    cadence: Bill['cadence'];
    nextDueAt: string;
    categoryId?: string;
    notes?: string;
  }) => string;
  markBillPaid: (billId: string) => void;
};

function nextDueAtFromCadence(currentNextDueAtIso: string, cadence: Bill['cadence']): string | undefined {
  const d = parseISO(currentNextDueAtIso);
  if (Number.isNaN(d.getTime())) return undefined;
  if (cadence === 'weekly') return addWeeks(d, 1).toISOString();
  if (cadence === 'monthly') return addMonths(d, 1).toISOString();
  if (cadence === 'yearly') return addYears(d, 1).toISOString();
  return undefined;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      version: 1,
      hasHydrated: false,
      households: {},
      members: {},
      tasks: {},
      lists: {},
      listItems: {},
      categories: {},
      budgets: {},
      transactions: {},
      bills: {},

      setHasHydrated: (value) => set({ hasHydrated: value }),

      bootstrap: () => {
        const state = get();
        if (Object.keys(state.households).length > 0) return;

        const createdAt = nowIso();
        const householdId = createId('hh');
        const memberId = createId('m');

        const shoppingListId = createId('list');
        const choresListId = createId('list');

        const seedCategories: Array<{ name: string; kind: Category['kind'] }> = [
          { name: 'Groceries', kind: 'expense' },
          { name: 'Rent', kind: 'expense' },
          { name: 'Utilities', kind: 'expense' },
          { name: 'Dining', kind: 'expense' },
          { name: 'Transport', kind: 'expense' },
          { name: 'Shopping', kind: 'expense' },
          { name: 'Salary', kind: 'income' },
          { name: 'Other Income', kind: 'income' },
        ];

        const categories: Entities<Category> = {};
        for (const c of seedCategories) {
          const id = createId('cat');
          categories[id] = {
            id,
            householdId,
            name: c.name,
            kind: c.kind,
            createdAt,
            updatedAt: createdAt,
          };
        }

        set({
          activeHouseholdId: householdId,
          activeMemberId: memberId,
          households: {
            [householdId]: { id: householdId, name: 'Home', createdAt },
          },
          members: {
            [memberId]: {
              id: memberId,
              householdId,
              displayName: 'You',
              role: 'owner',
              createdAt,
            },
          },
          lists: {
            [shoppingListId]: {
              id: shoppingListId,
              householdId,
              name: 'Shopping',
              createdAt,
              updatedAt: createdAt,
            },
            [choresListId]: {
              id: choresListId,
              householdId,
              name: 'Chores',
              createdAt,
              updatedAt: createdAt,
            },
          },
          categories,
        });
      },

      setActiveHousehold: (householdId) => {
        const state = get();
        const members = Object.values(state.members).filter((m) => m.householdId === householdId);
        set({
          activeHouseholdId: householdId,
          activeMemberId: members[0]?.id,
        });
      },

      createHousehold: (name) => {
        const id = createId('hh');
        const createdAt = nowIso();
        const shoppingListId = createId('list');
        const choresListId = createId('list');

        const seedCategories: Array<{ name: string; kind: Category['kind'] }> = [
          { name: 'Groceries', kind: 'expense' },
          { name: 'Rent', kind: 'expense' },
          { name: 'Utilities', kind: 'expense' },
          { name: 'Dining', kind: 'expense' },
          { name: 'Transport', kind: 'expense' },
          { name: 'Shopping', kind: 'expense' },
          { name: 'Salary', kind: 'income' },
          { name: 'Other Income', kind: 'income' },
        ];

        const categories: Entities<Category> = {};
        for (const c of seedCategories) {
          const catId = createId('cat');
          categories[catId] = {
            id: catId,
            householdId: id,
            name: c.name,
            kind: c.kind,
            createdAt,
            updatedAt: createdAt,
          };
        }

        set((s) => ({
          activeHouseholdId: id,
          households: {
            ...s.households,
            [id]: { id, name: name.trim() || 'Household', createdAt },
          },
          lists: {
            ...s.lists,
            [shoppingListId]: { id: shoppingListId, householdId: id, name: 'Shopping', createdAt, updatedAt: createdAt },
            [choresListId]: { id: choresListId, householdId: id, name: 'Chores', createdAt, updatedAt: createdAt },
          },
          categories: {
            ...s.categories,
            ...categories,
          },
        }));
        return id;
      },

      addMember: (householdId, displayName, role = 'member') => {
        const id = createId('m');
        const createdAt = nowIso();
        set((s) => ({
          members: {
            ...s.members,
            [id]: {
              id,
              householdId,
              displayName: displayName.trim() || 'Member',
              role,
              createdAt,
            },
          },
        }));
        return id;
      },

      createTask: ({ title, dueAt, notes, assignedToMemberId }) => {
        const s = get();
        const householdId = s.activeHouseholdId;
        if (!householdId) return '';
        const id = createId('task');
        const ts = nowIso();
        set((st) => ({
          tasks: {
            ...st.tasks,
            [id]: {
              id,
              householdId,
              title: title.trim() || 'Untitled task',
              notes,
              status: 'open',
              dueAt,
              createdAt: ts,
              updatedAt: ts,
              assignedToMemberId,
            },
          },
        }));
        return id;
      },

      toggleTaskDone: (taskId) => {
        const s = get();
        const t = s.tasks[taskId];
        if (!t) return;
        const ts = nowIso();
        set((st) => ({
          tasks: {
            ...st.tasks,
            [taskId]: {
              ...t,
              status: t.status === 'done' ? 'open' : 'done',
              updatedAt: ts,
            },
          },
        }));
      },

      createList: (name) => {
        const s = get();
        const householdId = s.activeHouseholdId;
        if (!householdId) return '';
        const id = createId('list');
        const ts = nowIso();
        set((st) => ({
          lists: {
            ...st.lists,
            [id]: {
              id,
              householdId,
              name: name.trim() || 'List',
              createdAt: ts,
              updatedAt: ts,
            },
          },
        }));
        return id;
      },

      addListItem: ({ listId, title, quantity, addedByMemberId }) => {
        const s = get();
        const list = s.lists[listId];
        if (!list) return '';
        const id = createId('li');
        const ts = nowIso();
        set((st) => ({
          listItems: {
            ...st.listItems,
            [id]: {
              id,
              householdId: list.householdId,
              listId,
              title: title.trim() || 'Item',
              quantity,
              status: 'open',
              createdAt: ts,
              updatedAt: ts,
              addedByMemberId,
            },
          },
        }));
        return id;
      },

      toggleListItemDone: (itemId) => {
        const s = get();
        const it = s.listItems[itemId];
        if (!it) return;
        const ts = nowIso();
        set((st) => ({
          listItems: {
            ...st.listItems,
            [itemId]: {
              ...it,
              status: it.status === 'done' ? 'open' : 'done',
              updatedAt: ts,
            },
          },
        }));
      },

      createCategory: ({ name, kind }) => {
        const s = get();
        const householdId = s.activeHouseholdId;
        if (!householdId) return '';
        const id = createId('cat');
        const ts = nowIso();
        set((st) => ({
          categories: {
            ...st.categories,
            [id]: {
              id,
              householdId,
              name: name.trim() || 'Category',
              kind,
              createdAt: ts,
              updatedAt: ts,
            },
          },
        }));
        return id;
      },

      upsertBudget: ({ month, categoryId, plannedAmount }) => {
        const s = get();
        const householdId = s.activeHouseholdId;
        if (!householdId) return '';

        const existing = Object.values(s.budgets).find(
          (b) => b.householdId === householdId && b.month === month && b.categoryId === categoryId
        );

        const ts = nowIso();
        const id = existing?.id ?? createId('budget');

        set((st) => ({
          budgets: {
            ...st.budgets,
            [id]: {
              id,
              householdId,
              month,
              categoryId,
              plannedAmount,
              createdAt: existing?.createdAt ?? ts,
              updatedAt: ts,
            },
          },
        }));

        return id;
      },

      createTransaction: ({ amount, categoryId, occurredAt, notes, createdByMemberId }) => {
        const s = get();
        const householdId = s.activeHouseholdId;
        if (!householdId) return '';

        const id = createId('txn');
        const ts = nowIso();
        set((st) => ({
          transactions: {
            ...st.transactions,
            [id]: {
              id,
              householdId,
              amount,
              categoryId,
              occurredAt,
              notes,
              createdAt: ts,
              updatedAt: ts,
              createdByMemberId,
            },
          },
        }));
        return id;
      },

      createBill: ({ name, amount, cadence, nextDueAt, categoryId, notes }) => {
        const s = get();
        const householdId = s.activeHouseholdId;
        if (!householdId) return '';

        const id = createId('bill');
        const ts = nowIso();
        set((st) => ({
          bills: {
            ...st.bills,
            [id]: {
              id,
              householdId,
              name: name.trim() || 'Bill',
              amount,
              cadence,
              nextDueAt,
              categoryId,
              notes,
              createdAt: ts,
              updatedAt: ts,
            },
          },
        }));
        return id;
      },

      markBillPaid: (billId) => {
        const s = get();
        const b = s.bills[billId];
        if (!b) return;

        const ts = nowIso();
        const next = nextDueAtFromCadence(b.nextDueAt, b.cadence);
        if (!next) {
          // one-time: archive
          set((st) => ({
            bills: {
              ...st.bills,
              [billId]: { ...b, archived: true, updatedAt: ts },
            },
          }));
          return;
        }

        set((st) => ({
          bills: {
            ...st.bills,
            [billId]: { ...b, nextDueAt: next, updatedAt: ts },
          },
        }));
      },
    }),
    {
      name: 'personal-hub-store',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (s) => ({
        version: s.version,
        hasHydrated: s.hasHydrated,
        activeHouseholdId: s.activeHouseholdId,
        activeMemberId: s.activeMemberId,
        households: s.households,
        members: s.members,
        tasks: s.tasks,
        lists: s.lists,
        listItems: s.listItems,
        categories: s.categories,
        budgets: s.budgets,
        transactions: s.transactions,
        bills: s.bills,
      }),
    }
  )
);
