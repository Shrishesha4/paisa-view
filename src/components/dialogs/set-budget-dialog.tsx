"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CATEGORIES } from "@/lib/constants";
import type { Budget } from "@/lib/types";

const formSchema = z.object({
  budgets: z.array(z.object({
    category: z.enum(CATEGORIES),
    amount: z.coerce.number().min(0, "Budget must be non-negative"),
  })),
});

type SetBudgetDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSetBudgets: (budgets: Budget[]) => void;
  currentBudgets: Budget[];
};

export function SetBudgetDialog({ isOpen, onClose, onSetBudgets, currentBudgets }: SetBudgetDialogProps) {
  const defaultValues = CATEGORIES.map(category => {
    const existingBudget = currentBudgets.find(b => b.category === category);
    return { category, amount: existingBudget ? existingBudget.amount : 0 };
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      budgets: defaultValues,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onSetBudgets(values.budgets);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set Monthly Budgets</DialogTitle>
          <DialogDescription>
            Define your spending goals for each category.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {CATEGORIES.map((category, index) => (
              <FormField
                key={category}
                control={form.control}
                name={`budgets.${index}.amount`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{category}</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit">Save Budgets</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
