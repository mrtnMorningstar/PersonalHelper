export type ISODateString = string;

export type HouseholdRole = 'owner' | 'admin' | 'member';

export type Household = {
  id: string;
  name: string;
  createdAt: ISODateString;
};

export type HouseholdMember = {
  id: string;
  householdId: string;
  displayName: string;
  role: HouseholdRole;
  createdAt: ISODateString;
};

export type TaskStatus = 'open' | 'done' | 'archived';

export type Task = {
  id: string;
  householdId: string;
  title: string;
  notes?: string;
  status: TaskStatus;
  dueAt?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  assignedToMemberId?: string;
};

export type List = {
  id: string;
  householdId: string;
  name: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  archived?: boolean;
};

export type ListItemStatus = 'open' | 'done' | 'archived';

export type ListItem = {
  id: string;
  householdId: string;
  listId: string;
  title: string;
  quantity?: string;
  status: ListItemStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  addedByMemberId?: string;
};

export type BillCadence = 'one_time' | 'weekly' | 'monthly' | 'yearly';

export type Bill = {
  id: string;
  householdId: string;
  name: string;
  amount: number;
  cadence: BillCadence;
  nextDueAt: ISODateString;
  categoryId?: string;
  notes?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  archived?: boolean;
};

export type CategoryKind = 'income' | 'expense' | 'transfer';

export type Category = {
  id: string;
  householdId: string;
  name: string;
  kind: CategoryKind;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  archived?: boolean;
};

export type Transaction = {
  id: string;
  householdId: string;
  amount: number; // negative for expense, positive for income
  categoryId: string;
  occurredAt: ISODateString;
  notes?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  createdByMemberId?: string;
};

export type Budget = {
  id: string;
  householdId: string;
  month: string; // YYYY-MM
  categoryId: string;
  plannedAmount: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type QuickCaptureKind = 'task' | 'list_item' | 'transaction' | 'bill';
