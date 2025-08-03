import type { Category, IncomeCategory } from './types';
import {
  UtensilsCrossed,
  Car,
  Bolt,
  Home,
  Film,
  HeartPulse,
  ShoppingBag,
  PlusCircle,
  Landmark,
  type LucideIcon,
} from 'lucide-react';

export const CATEGORIES: Category[] = [
  'Food',
  'Transport',
  'Utilities',
  'Rent',
  'Entertainment',
  'Health',
  'Shopping',
  'Other',
];

export const INCOME_CATEGORY: IncomeCategory = 'Income';

export const CATEGORY_ICONS: Record<Category | IncomeCategory, LucideIcon> = {
  Food: UtensilsCrossed,
  Transport: Car,
  Utilities: Bolt,
  Rent: Home,
  Entertainment: Film,
  Health: HeartPulse,
  Shopping: ShoppingBag,
  Other: PlusCircle,
  Income: Landmark,
};
