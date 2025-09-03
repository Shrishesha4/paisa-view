
"use client";

import { useState, useMemo, useEffect } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { Expense, Income, Budget } from "@/lib/types";
import { INCOME_CATEGORY } from "@/lib/constants";
import { AddExpenseDialog } from "./dialogs/add-expense-dialog";
import { AddIncomeDialog } from "./dialogs/add-income-dialog";
import { SetBudgetDialog } from "./dialogs/set-budget-dialog";
import { DashboardHeader } from "./dashboard-header";
import { SummaryCards } from "./summary-cards";
import { ExpensePieChart } from "./expense-pie-chart";
import { RecentTransactions } from "./recent-transactions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { ClearDataDialog } from "./dialogs/clear-data-dialog";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { useAuth } from "@/lib/auth-context";
import { FirestoreService, UserData } from "@/lib/firestore";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function DashboardClient() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [expenses, setExpenses] = useLocalStorage<Expense[]>("expenses", []);
  const [income, setIncome] = useLocalStorage<Income[]>("income", []);
  const [budget, setBudget] = useLocalStorage<Budget>("budget", { id: "default-budget", amount: 1000 });
  
  // Offline sync integration
  const { addExpenseToSync, addIncomeToSync, addBudgetToSync, triggerManualSync } = useOfflineSync();
  
  const [isAddExpenseOpen, setAddExpenseOpen] = useState(false);
  const [isAddIncomeOpen, setAddIncomeOpen] = useState(false);
  const [isSetBudgetOpen, setSetBudgetOpen] = useState(false);
  const [isClearDataOpen, setClearDataOpen] = useState(false);

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleAddExpense = (expense: Omit<Expense, "id">) => {
    const newExpense = { ...expense, id: generateId(), date: new Date().toISOString() };
    setExpenses([...expenses, newExpense]);
    
    // Add to offline sync queue
    addExpenseToSync(newExpense, 'create');
    
    toast({ title: "Expense Added", description: "Your expense has been successfully recorded." });
  };

  // Generate unique ID that works across all browsers
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const handleAddIncome = (newIncome: Omit<Income, "id" | "category" | "date">) => {
    const newIncomeRecord: Income = { 
      ...newIncome, 
      id: generateId(), 
      category: INCOME_CATEGORY, 
      date: new Date().toISOString() 
    };
    setIncome([...income, newIncomeRecord]);
    
    // Add to offline sync queue
    addIncomeToSync(newIncomeRecord, 'create');
    
    toast({ title: "Income Added", description: "Your income has been successfully recorded." });
  };

  const handleSetBudget = (newBudget: Budget) => {
    setBudget(newBudget);
    
    // Add to offline sync queue
    addBudgetToSync(newBudget, 'update');
    
    toast({ title: "Budget Updated", description: "Your monthly budget has been set." });
  };

  const handleManualSync = async () => {
    if (!user) {
      toast({ 
        title: "Not Signed In", 
        description: "Please sign in to sync your data to the cloud.",
        variant: "destructive"
      });
      return;
    }

    try {
      toast({ 
        title: "Syncing Data", 
        description: "Syncing your local data to the cloud..." 
      });

      // First get current user data to check household status
      const currentUserData = await FirestoreService.getUserData(user.uid);
      
      // Create user data object from local storage
      const syncUserData: Partial<UserData> = {
        expenses: expenses,
        incomes: income,
        budgets: [budget],
        categories: [],
        lastSync: new Date(),
        email: user.email || '',
        displayName: user.displayName || '',
      };

      // Always preserve existing household information if it exists
      if (currentUserData) {
        if (currentUserData.householdId) {
          syncUserData.householdId = currentUserData.householdId;
          syncUserData.isAdmin = currentUserData.isAdmin || false;
        }
        // Also preserve any other metadata that might exist
        if (currentUserData.householdRemoved !== undefined) {
          syncUserData.householdRemoved = currentUserData.householdRemoved;
        }
        if (currentUserData.householdRemovedBy !== undefined) {
          syncUserData.householdRemovedBy = currentUserData.householdRemovedBy;
        }
        if (currentUserData.householdRemovedAt !== undefined) {
          syncUserData.householdRemovedAt = currentUserData.householdRemovedAt;
        }
      }

      // Create a properly typed UserData object with only defined values
      const cleanSyncData: UserData = {
        expenses: syncUserData.expenses || [],
        incomes: syncUserData.incomes || [],
        budgets: syncUserData.budgets || [],
        categories: syncUserData.categories || [],
        lastSync: syncUserData.lastSync || new Date(),
        email: syncUserData.email || '',
        displayName: syncUserData.displayName || '',
      };

      // Only add household fields if they have actual values (not undefined)
      if (syncUserData.householdId) {
        cleanSyncData.householdId = syncUserData.householdId;
        console.log('🏠 Including householdId:', syncUserData.householdId);
      }
      
      if (syncUserData.isAdmin !== undefined) {
        cleanSyncData.isAdmin = syncUserData.isAdmin;
        console.log('👑 Including isAdmin:', syncUserData.isAdmin);
      }
      
      if (syncUserData.householdRemoved !== undefined) {
        cleanSyncData.householdRemoved = syncUserData.householdRemoved;
      }
      
      if (syncUserData.householdRemovedBy !== undefined) {
        cleanSyncData.householdRemovedBy = syncUserData.householdRemovedBy;
      }
      
      if (syncUserData.householdRemovedAt !== undefined) {
        cleanSyncData.householdRemovedAt = syncUserData.householdRemovedAt;
      }
      
      console.log('🔄 Final data to sync to Firestore:', cleanSyncData);
      console.log('🔍 Checking for undefined values:', Object.entries(cleanSyncData).filter(([k, v]) => v === undefined).map(([k]) => k));
      
      // Sync to Firestore
      await FirestoreService.syncUserData(user.uid, cleanSyncData);
      
      toast({ 
        title: "Sync Complete", 
        description: "Your data has been successfully synced to the cloud." 
      });

      // Trigger offline sync to process any queued items
      await triggerManualSync();
      
    } catch (error) {
      console.error('Manual sync error:', error);
      toast({ 
        title: "Sync Failed", 
        description: "Failed to sync data to the cloud. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleClearAllData = async (deleteCloudData: boolean = false) => {
    try {
      // Clear local data
      setExpenses([]);
      setIncome([]);
      setBudget({ id: "default-budget", amount: 0 });
      
      // Clear cloud data if requested and user is authenticated
      if (deleteCloudData) {
        if (user) {
          try {
            // First get the current user data to preserve household information
            const currentUserData = await FirestoreService.getUserData(user.uid);
            
            const emptyUserData: UserData = {
              expenses: [],
              incomes: [],
              budgets: [],
              categories: [],
              lastSync: new Date(),
              // Preserve household information if it exists
              householdId: currentUserData?.householdId || undefined,
              isAdmin: currentUserData?.isAdmin || false,
              email: currentUserData?.email || user.email || '',
              displayName: currentUserData?.displayName || user.displayName || '',
            };
            
            // Clean the data to ensure no undefined values
            const cleanEmptyUserData = Object.fromEntries(
              Object.entries(emptyUserData).filter(([_, value]) => value !== undefined)
            ) as UserData;
            
            console.log('🧹 Clearing user data while preserving household info:', cleanEmptyUserData);
            
            await FirestoreService.syncUserData(user.uid, cleanEmptyUserData);
            
            toast({ 
              title: "Data Cleared Everywhere", 
              description: "All your data has been deleted from both device and cloud." 
            });
            
            // Force a page reload to update household data
            setTimeout(() => {
              window.location.reload();
            }, 1000);
            
          } catch (cloudError) {
            console.error('Error clearing cloud data:', cloudError);
            toast({ 
              title: "Local Data Cleared", 
              description: "Local data cleared but failed to clear cloud data. Try again later.",
              variant: "destructive"
            });
          }
        } else {
          toast({ 
            title: "Cloud Deletion Skipped", 
            description: "Local data cleared. Sign in to clear cloud data as well.",
            variant: "destructive"
          });
        }
      } else {
        toast({ 
          title: "Local Data Cleared", 
          description: "All your local data has been successfully deleted." 
        });
      }
    } catch (error) {
      console.error('Error clearing data:', error);
      toast({ 
        title: "Error", 
        description: "Failed to clear data. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Utility function to fix corrupted Firestore data
  const fixCorruptedData = async () => {
    if (!user) return;
    
    try {
      console.log('🔧 Attempting to fix corrupted Firestore data...');
      
      // Get current user data
      const currentUserData = await FirestoreService.getUserData(user.uid);
      
      if (currentUserData) {
        // Create a clean version of the data with only valid fields
        const cleanData: Partial<UserData> = {
          expenses: currentUserData.expenses || [],
          incomes: currentUserData.incomes || [],
          budgets: currentUserData.budgets || [],
          categories: currentUserData.categories || [],
          lastSync: new Date(),
        };
        
        // Only add household fields if they exist and are valid
        if (currentUserData.householdId && typeof currentUserData.householdId === 'string') {
          cleanData.householdId = currentUserData.householdId;
        }
        
        if (typeof currentUserData.isAdmin === 'boolean') {
          cleanData.isAdmin = currentUserData.isAdmin;
        }
        
        if (currentUserData.email && typeof currentUserData.email === 'string') {
          cleanData.email = currentUserData.email;
        }
        
        if (currentUserData.displayName && typeof currentUserData.displayName === 'string') {
          cleanData.displayName = currentUserData.displayName;
        }
        
        console.log('🧹 Fixed data structure:', cleanData);
        
        // Use setDoc with merge to ensure clean document structure
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, cleanData, { merge: true });
        
        toast({
          title: "Data Fixed!",
          description: "Corrupted Firestore data has been repaired.",
        });
        
        // Reload the page
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        
      }
    } catch (error) {
      console.error('Error fixing corrupted data:', error);
      toast({
        title: "Fix Failed",
        description: "Could not repair corrupted data. Please contact support.",
        variant: "destructive",
      });
    }
  };

  const handleExportData = () => {
    const dataToExport = {
      expenses,
      income,
      budget,
    };
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `paisa-view-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Data Exported", description: "Your data has been successfully exported." });
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const result = e.target?.result as string;
          const importedData = JSON.parse(result);
          
          console.log('🔍 Import Debug:', {
            expensesCount: importedData.expenses?.length || 0,
            incomeCount: importedData.income?.length || 0,
            budget: importedData.budget
          });
          
          if (importedData.expenses && importedData.income && importedData.budget) {
            // Validate data structure and fix types
            const validExpenses = Array.isArray(importedData.expenses) ? importedData.expenses : [];
                  const validIncome = Array.isArray(importedData.income) ? importedData.income.map((inc: unknown) => {
        if (inc && typeof inc === 'object' && inc !== null) {
          return {
            ...(inc as Record<string, unknown>),
            category: INCOME_CATEGORY
          };
        }
        return { id: `income-${Date.now()}`, amount: 0, date: new Date().toISOString(), description: 'Imported', category: INCOME_CATEGORY };
      }) : [];
            const validBudget = importedData.budget && typeof importedData.budget.amount === 'number' ? importedData.budget : { amount: 1000 };
            
            console.log('✅ Validated data:', {
              expenses: validExpenses.length,
              income: validIncome.length,
              budget: validBudget.amount
            });
            
            // Update local state
            setExpenses(validExpenses);
            setIncome(validIncome);
            setBudget(validBudget);
            
            // If user is authenticated, sync to Firestore
            if (user) {
              try {
                // First get the current user data to preserve household information
                const currentUserData = await FirestoreService.getUserData(user.uid);
                
                const userData: UserData = {
                  expenses: validExpenses,
                  incomes: validIncome, // Map "income" to "incomes" for Firestore
                  budgets: validBudget ? [validBudget] : [],
                  categories: [], // Add default categories if needed
                  lastSync: new Date(),
                  // Preserve household information if it exists
                  householdId: currentUserData?.householdId || undefined,
                  isAdmin: currentUserData?.isAdmin || false,
                  email: currentUserData?.email || user.email || '',
                  displayName: currentUserData?.displayName || user.displayName || '',
                };
                
                // Clean the data to ensure no undefined values and validate householdId
                const cleanUserData = Object.fromEntries(
                  Object.entries(userData).filter(([key, value]) => {
                    if (value === undefined) return false;
                    if (key === 'householdId' && (value === null || value === undefined)) return false;
                    return true;
                  })
                ) as UserData;
                
                // Ensure householdId is properly set and check for typos
                if (currentUserData?.householdId) {
                  cleanUserData.householdId = currentUserData.householdId;
                  console.log('✅ Using existing householdId:', currentUserData.householdId);
                } else {
                  console.log('⚠️ No existing householdId found');
                  // Remove householdId field if it doesn't exist
                  delete cleanUserData.householdId;
                }
                
                // Double-check that we're not sending any undefined values
                Object.entries(cleanUserData).forEach(([key, value]) => {
                  if (value === undefined) {
                    console.error(`❌ Found undefined value for field: ${key}`);
                    delete cleanUserData[key as keyof UserData];
                  }
                });
                
                // Final validation - ensure all required fields are present
                if (!cleanUserData.expenses || !cleanUserData.incomes) {
                  throw new Error('Missing required financial data fields');
                }
                
                console.log('🧹 Cleaned user data for Firestore:', cleanUserData);
                console.log('🔍 Field-by-field check:', {
                  expenses: cleanUserData.expenses?.length || 0,
                  incomes: cleanUserData.incomes?.length || 0,
                  budgets: cleanUserData.budgets?.length || 0,
                  categories: cleanUserData.categories?.length || 0,
                  householdId: cleanUserData.householdId,
                  isAdmin: cleanUserData.isAdmin,
                  email: cleanUserData.email,
                  displayName: cleanUserData.displayName
                });
                
                console.log('📤 Syncing to Firestore:', {
                  expensesCount: cleanUserData.expenses.length,
                  incomesCount: cleanUserData.incomes.length,
                  budgetsCount: cleanUserData.budgets.length,
                  householdId: cleanUserData.householdId,
                  isAdmin: cleanUserData.isAdmin
                });
                
                await FirestoreService.migrateLocalData(user.uid, cleanUserData);
                
                toast({ 
                  title: "Data Imported & Synced!", 
                  description: "Your data has been imported and synced to the cloud." 
                });
                
                // If user is in a household, trigger household data refresh
                if (cleanUserData.householdId) {
                  console.log('🔄 User is in household, triggering data refresh...');
                  toast({
                    title: "Household Data Updated!",
                    description: "Your imported data has been added to household totals. Visit the household page to see the updated figures.",
                  });
                  // Force a page reload to update the household data
                  setTimeout(() => {
                    window.location.reload();
                  }, 1000);
                } else {
                  // Just reload the current page if not in household
                  setTimeout(() => {
                    window.location.reload();
                  }, 1000);
                }
                
              } catch (syncError) {
                console.error('Firestore sync error:', syncError);
                toast({ 
                  title: "Import Successful, Sync Failed", 
                  description: "Data imported locally but failed to sync to cloud. Try syncing manually.",
                  variant: "destructive"
                });
              }
            } else {
              toast({ 
                title: "Data Imported", 
                description: "Your data has been imported locally. Sign in to sync to cloud." 
              });
            }
          } else {
            toast({ 
              variant: "destructive", 
              title: "Invalid File", 
              description: "The selected file has an invalid format. Expected: expenses, income, budget" 
            });
          }
        } catch (error) {
          console.error('Import error:', error);
          toast({ 
            variant: "destructive", 
            title: "Import Failed", 
            description: "There was an error importing your data. Please check the file format." 
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const { totalIncome, totalExpenses, savings } = useMemo(() => {
    const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
    const savings = totalIncome - totalExpenses;

    return { totalIncome, totalExpenses, savings };
  }, [income, expenses]);

  return (
    <>
      <div className="flex-1 flex flex-col bg-background container mx-auto px-4 md:px-6 py-4 md:py-6">
        <DashboardHeader
          onSetBudget={() => setSetBudgetOpen(true)}
          onAddExpense={() => setAddExpenseOpen(true)}
          onAddIncome={() => setAddIncomeOpen(true)}
          onExport={handleExportData}
          onImport={handleImportData}
          onClearAllData={() => setClearDataOpen(true)}
          onFixCorruptedData={fixCorruptedData}
          onSyncData={handleManualSync}
        />
        <main className="flex-1 space-y-6 md:space-y-8 mt-6">
            <div className="grid gap-6 md:gap-8 grid-cols-1 sm:grid-cols-3">
                <SummaryCards
                    isClient={isClient}
                    totalIncome={totalIncome}
                    totalExpenses={totalExpenses}
                    savings={savings}
                />
            </div>
            

            <div className="grid gap-6 md:gap-8 grid-cols-1 lg:grid-cols-5">
                <div className="lg:col-span-3">
                    <ExpensePieChart isClient={isClient} expenses={expenses} />
                </div>
                <div className="lg:col-span-2">
                    <RecentTransactions isClient={isClient} expenses={expenses} income={income} />
                </div>
            </div>
        </main>
      </div>

       <div className="fixed bottom-4 left-4 right-4 z-50 md:hidden">
        <div className="mx-auto max-w-sm p-2 rounded-2xl bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg">
            <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => setAddExpenseOpen(true)} size="lg" className="shadow-lg rounded-xl"><PlusCircle className="mr-2 h-4 w-4" /> Expense</Button>
                <Button onClick={() => setAddIncomeOpen(true)} variant="secondary" size="lg" className="shadow-lg rounded-xl">Add Income</Button>
            </div>
        </div>
      </div>

      <AddExpenseDialog
        isOpen={isAddExpenseOpen}
        onClose={() => setAddExpenseOpen(false)}
        onAddExpense={handleAddExpense}
      />
      <AddIncomeDialog
        isOpen={isAddIncomeOpen}
        onClose={() => setAddIncomeOpen(false)}
        onAddIncome={handleAddIncome}
      />
       <SetBudgetDialog
        isOpen={isSetBudgetOpen}
        onClose={() => setSetBudgetOpen(false)}
        onSetBudget={handleSetBudget}
        currentBudget={budget}
      />
      <ClearDataDialog
        isOpen={isClearDataOpen}
        onClose={() => setClearDataOpen(false)}
        onConfirm={handleClearAllData}
      />
    </>
  );
}
