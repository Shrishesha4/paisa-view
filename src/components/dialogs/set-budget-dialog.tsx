
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
  // Prevent body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: currentBudget.amount || 0,
    },
  });

  React.useEffect(() => {
    if (isOpen) {
        form.reset({ amount: currentBudget.amount || 0 });
    }
  }, [currentBudget, form, isOpen]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    onSetBudget({ id: `budget-${Date.now()}`, ...values });
    onClose();
  }
  
  const handleDialogChange = (open: boolean) => {
    if (!open) {
      form.reset({ amount: currentBudget.amount || 0 });
      onClose();
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="modal-fixed">
        <div className="modal-content">
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
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      className="mobile-input" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Save Budget</Button>
            </DialogFooter>
          </form>
        </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
