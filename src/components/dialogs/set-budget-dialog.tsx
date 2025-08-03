"use client";

import * as React from "react";
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
import type { Budget } from "@/lib/types";

const formSchema = z.object({
  amount: z.coerce.number().min(0, "Budget must be non-negative"),
});

type SetBudgetDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSetBudget: (budget: Budget) => void;
  currentBudget: Budget;
};

export function SetBudgetDialog({ isOpen, onClose, onSetBudget, currentBudget }: SetBudgetDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: currentBudget.amount || 0,
    },
  });

  // useEffect to reset form when currentBudget changes
  React.useEffect(() => {
    form.reset({ amount: currentBudget.amount || 0 });
  }, [currentBudget, form, isOpen]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    onSetBudget(values);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Monthly Budget</DialogTitle>
          <DialogDescription>
            Define your total spending goal for the month.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Monthly Budget</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit">Save Budget</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
