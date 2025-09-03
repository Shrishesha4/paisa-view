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
  CircleDollarSign,
} from 'lucide-react';

export { INCOME_CATEGORY } from './types';

const DEFAULT_CATEGORY_ICON = CircleDollarSign;

const PREDEFINED_ICONS: Record<string, LucideIcon> = {
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

export const getCategoryIcon = (category: Category | IncomeCategory): LucideIcon => {
    return PREDEFINED_ICONS[category] || DEFAULT_CATEGORY_ICON;
}
