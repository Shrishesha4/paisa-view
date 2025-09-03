
"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "../ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type ClearDataDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteCloudData: boolean) => void;
};

export function ClearDataDialog({ isOpen, onClose, onConfirm }: ClearDataDialogProps) {
  const [deleteCloudData, setDeleteCloudData] = useState(false);
  
  const handleConfirm = () => {
    onConfirm(deleteCloudData);
    onClose();
    // Reset checkbox state when dialog closes
    setDeleteCloudData(false);
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete all of your
            income, expense, and budget data from your device.
            {deleteCloudData && (
              <span className="block mt-2 text-red-600 font-medium">
                ⚠️ Warning: You've selected to also delete cloud data. This will remove your data from all devices permanently.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="flex items-center space-x-2 p-4 border-t bg-muted/30 rounded-lg mx-4">
          <Checkbox
            id="delete-cloud-data"
            checked={deleteCloudData}
            onCheckedChange={(checked) => setDeleteCloudData(checked as boolean)}
          />
          <Label htmlFor="delete-cloud-data" className="text-sm font-medium cursor-pointer">
            Also delete data from cloud?
          </Label>
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive" })}
            onClick={handleConfirm}
          >
            {deleteCloudData ? "Yes, delete everything everywhere" : "Yes, delete local data only"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
