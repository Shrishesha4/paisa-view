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
  DialogClose,
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
import type { Expense } from "@/lib/types";
import { capitalize } from "@/lib/utils";
import React, { useCallback, useEffect } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { getLocalCategorySuggestion } from "@/lib/categorization";

const formSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().min(0.01, "Amount must be positive"),
  category: z.string().min(1, "Category is required"),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date",
  }),
});

type AddExpenseDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onAddExpense: (expense: Omit<Expense, "id">) => void;
};

export function AddExpenseDialog({ isOpen, onClose, onAddExpense }: AddExpenseDialogProps) {
  const [expenses] = useLocalStorage<Expense[]>("expenses", []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      amount: 0,
      category: "",
      date: new Date().toISOString().split("T")[0],
    },
  });

  const fetchSuggestion = useCallback((description: string) => {
    if (description) {
      const suggestion = getLocalCategorySuggestion(description, expenses);
      if (suggestion) {
        form.setValue("category", suggestion, { shouldValidate: true });
      }
    }
  }, [expenses, form]);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'description') {
        const timer = setTimeout(() => fetchSuggestion(value.description || ''), 300);
        return () => clearTimeout(timer);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, fetchSuggestion]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    onAddExpense({
        ...values,
        category: capitalize(values.category),
    });
    form.reset({
      description: "",
      amount: 0,
      category: "",
      date: new Date().toISOString().split("T")[0],
    });
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        form.reset({
          description: "",
          amount: 0,
          category: "",
          date: new Date().toISOString().split("T")[0],
        });
      }
      onClose();
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
          <DialogDescription>
            Enter the details of your expense below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Coffee with friends" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                   <FormControl>
                      <Input placeholder="e.g., Food" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Add Expense</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
