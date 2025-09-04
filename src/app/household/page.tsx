"use client";

import { useAuth } from "@/lib/auth-context";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, 
  Home, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  LogOut,
  Settings,
  UserPlus,
  RefreshCw,
  Crown,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  User,
  Plus,
  BarChart3,
  Target
} from "lucide-react";
import { FirestoreService, UserData, Household } from "@/lib/firestore";
import { HouseholdBudget, BudgetGoal } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export default function HouseholdPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [householdMembers, setHouseholdMembers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"overview" | "monthly" | "reports" | "budget" | "members">("overview");
  
  // Aggregated financial data
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isDebugExpanded, setIsDebugExpanded] = useState(false);
  const [isActionsExpanded, setIsActionsExpanded] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [householdName, setHouseholdName] = useState('');
  const [joinHouseholdName, setJoinHouseholdName] = useState('');
  
  // Reports data
  const [monthlyComparisons, setMonthlyComparisons] = useState<any[]>([]);
  const [yearlyComparisons, setYearlyComparisons] = useState<any[]>([]);
  const [financialYearData, setFinancialYearData] = useState<any>(null);
  
  // Budget and Goals data
  const [householdBudget, setHouseholdBudget] = useState<HouseholdBudget | null>(null);
  const [budgetGoals, setBudgetGoals] = useState<BudgetGoal[]>([]);
  const [budgetProgress, setBudgetProgress] = useState<any>(null);
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  
  // Temporary form data
  const [tempBudget, setTempBudget] = useState<Partial<HouseholdBudget>>({});
  const [tempGoal, setTempGoal] = useState<Partial<BudgetGoal>>({});

  // Calculated values
  const totalSavings = totalIncome - totalExpenses;
  const monthlySavings = monthlyIncome - monthlyExpenses;

  useEffect(() => {
    // Only load household data if user is authenticated
    if (user) {
      loadHouseholdData();
    }
  }, [user]);

  // Set up periodic data refresh check (silent background refresh)
  useEffect(() => {
    if (!user || !userData?.householdId) return;
    
    // Check for updates every 30 seconds silently
    const interval = setInterval(async () => {
      try {
        if (!user || !userData?.householdId) return;
        
        // Get fresh household data silently
        const freshHouseholdData = await FirestoreService.getHouseholdData(userData.householdId);
        
        // Check if any member's data has changed
        let hasChanges = false;
        
        if (freshHouseholdData.length !== householdMembers.length) {
          hasChanges = true;
        } else {
          // Compare each member's data
          for (let i = 0; i < freshHouseholdData.length; i++) {
            const fresh = freshHouseholdData[i];
            const current = householdMembers[i];
            
            if (!current || 
                fresh.expenses?.length !== current.expenses?.length ||
                fresh.incomes?.length !== current.incomes?.length) {
              hasChanges = true;
              break;
            }
          }
        }
        
        if (hasChanges) {
          // Update state without showing toast
          setHouseholdMembers(freshHouseholdData);
          calculateAggregatedFinances(freshHouseholdData);
          
          // Also calculate reports data
          if (freshHouseholdData.length > 0) {
            calculateReportsData(freshHouseholdData);
          }
        }
      } catch (error) {
        console.error('Error in silent data refresh:', error);
        // Don't show toast for background refresh errors
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [user, userData?.householdId, householdMembers.length]);

  const loadHouseholdData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await FirestoreService.getUserData(user.uid);
      setUserData(data);
      
      // Update current user's data if missing
      if (data && (!data.email || !data.displayName)) {
        try {
          await FirestoreService.updateUserEmail(
            user.uid, 
            user.email || '', 
            user.displayName || undefined
          );
          // Reload user data after update
          const updatedData = await FirestoreService.getUserData(user.uid);
          setUserData(updatedData);
        } catch (error) {
          console.error('Error updating user data:', error);
        }
      }
      
      if (data?.householdId) {
        // Load household data
        const householdData = await FirestoreService.getHouseholdData(data.householdId);
        setHouseholdMembers(householdData);
        
        // Load household details
        const householdDoc = await FirestoreService.getHousehold(data.householdId);
        setHousehold(householdDoc);
        
        // Calculate aggregated financial data
        calculateAggregatedFinances(householdData);
        
        // Load budget and goals data
        await loadBudgetAndGoalsData(data.householdId);
      }
    } catch (error) {
      console.error("Error loading household data:", error);
      toast({
        title: "Error",
        description: "Failed to load household data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };



  const calculateAggregatedFinances = (members: UserData[]) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let totalExp = 0;
    let totalInc = 0;
    let monthlyExp = 0;
    let monthlyInc = 0;
    
    members.forEach((member) => {
      // Calculate total expenses and income
      const memberExpenses = member.expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
      const memberIncome = member.incomes?.reduce((sum, inc) => sum + inc.amount, 0) || 0;
      
      totalExp += memberExpenses;
      totalInc += memberIncome;
      
      // Calculate current month expenses and income
      const currentMonthExpenses = member.expenses?.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
      }).reduce((sum, exp) => sum + exp.amount, 0) || 0;
      
      const currentMonthIncome = member.incomes?.filter(inc => {
        const incDate = new Date(inc.date);
        return incDate.getMonth() === currentMonth && incDate.getFullYear() === currentYear;
      }).reduce((sum, inc) => sum + inc.amount, 0) || 0;
      
      monthlyExp += currentMonthExpenses;
      monthlyInc += currentMonthIncome;
    });
    

    
    setTotalExpenses(totalExp);
    setTotalIncome(totalInc);
    setMonthlyExpenses(monthlyExp);
    setMonthlyIncome(monthlyInc);
    setLastUpdated(new Date());
    
    // Calculate reports data if we have enough data
    if (members.length > 0) {
      calculateReportsData(members);
    }
  };

  const calculateReportsData = (members: UserData[]) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentDate = now.getDate();
    
    // Get all expenses and incomes across all members
    const allExpenses = members.flatMap(member => member.expenses || []);
    const allIncomes = members.flatMap(member => member.incomes || []);
    
    // Calculate month-to-date vs previous month-to-date
    const calculateMonthToDate = (month: number, year: number, endDate: number) => {
      let expenses = 0;
      let income = 0;
      
      allExpenses.forEach(exp => {
        const date = new Date(exp.date);
        if (date.getMonth() === month && date.getFullYear() === year && date.getDate() <= endDate) {
          expenses += exp.amount;
        }
      });
      
      allIncomes.forEach(inc => {
        const date = new Date(inc.date);
        if (date.getMonth() === month && date.getFullYear() === year && date.getDate() <= endDate) {
          income += inc.amount;
        }
      });
      
      return { expenses, income };
    };
    
    // Get current month-to-date data
    const currentMonthData = calculateMonthToDate(currentMonth, currentYear, currentDate);
    
    // Get previous month-to-date data (same date range)
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const previousMonthData = calculateMonthToDate(previousMonth, previousYear, currentDate);
    
    // Calculate month-over-month comparisons with same-date logic
    if (currentMonthData.expenses > 0 || currentMonthData.income > 0 || previousMonthData.expenses > 0 || previousMonthData.income > 0) {
      const expenseChange = previousMonthData.expenses > 0 ? 
        ((currentMonthData.expenses - previousMonthData.expenses) / previousMonthData.expenses) * 100 : 0;
      const incomeChange = previousMonthData.income > 0 ? 
        ((currentMonthData.income - previousMonthData.income) / previousMonthData.income) * 100 : 0;
      
      const currentMonthName = new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const previousMonthName = new Date(previousYear, previousMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      setMonthlyComparisons([{
        month: currentMonth,
        year: currentYear,
        monthName: currentMonthName,
        previousMonthName: previousMonthName,
        expenses: currentMonthData.expenses,
        income: currentMonthData.income,
        savings: currentMonthData.income - currentMonthData.expenses,
        expenseChange,
        incomeChange,
        isExpenseIncrease: expenseChange > 0,
        isIncomeIncrease: incomeChange > 0,
        isCurrentMonth: true,
        comparisonType: `Month-to-Date (1-${currentDate}) vs Previous Month (1-${currentDate})`,
        previousMonthExpenses: previousMonthData.expenses,
        previousMonthIncome: previousMonthData.income
      }]);
    } else {
      setMonthlyComparisons([]);
    }
    
    // Calculate yearly comparisons using full month data
    const yearlyData: { [key: number]: { expenses: number; income: number } } = {};
    
    // Group all expenses and incomes by year
    allExpenses.forEach(exp => {
      const date = new Date(exp.date);
      const year = date.getFullYear();
      if (!yearlyData[year]) {
        yearlyData[year] = { expenses: 0, income: 0 };
      }
      yearlyData[year].expenses += exp.amount;
    });
    
    allIncomes.forEach(inc => {
      const date = new Date(inc.date);
      const year = date.getFullYear();
      if (!yearlyData[year]) {
        yearlyData[year] = { expenses: 0, income: 0 };
      }
      yearlyData[year].income += inc.amount;
    });
    
    const sortedYears = Object.entries(yearlyData)
      .map(([year, data]) => ({ year: parseInt(year), ...data }))
      .sort((a, b) => a.year - b.year);
    
    if (sortedYears.length >= 2) {
      const yearlyComparisons = [];
      for (let i = 1; i < sortedYears.length; i++) {
        const current = sortedYears[i];
        const previous = sortedYears[i - 1];
        
        const expenseChange = previous.expenses > 0 ? ((current.expenses - previous.expenses) / previous.expenses) * 100 : 0;
        const incomeChange = previous.income > 0 ? ((current.income - previous.income) / previous.income) * 100 : 0;
        
        yearlyComparisons.push({
          year: current.year,
          expenses: current.expenses,
          income: current.income,
          savings: current.income - current.expenses,
          expenseChange,
          incomeChange,
          isExpenseIncrease: expenseChange > 0,
          isIncomeIncrease: incomeChange > 0
        });
      }
      setYearlyComparisons(yearlyComparisons);
    }
    
    // Calculate financial year data (April to March)
    const financialYearStart = currentMonth >= 3 ? currentYear : currentYear - 1;
    const financialYearEnd = financialYearStart + 1;
    
    let fyExpenses = 0;
    let fyIncome = 0;
    
    // Calculate financial year totals from all data
    allExpenses.forEach(exp => {
      const date = new Date(exp.date);
      if (date.getFullYear() === financialYearStart && date.getMonth() >= 3) {
        fyExpenses += exp.amount;
      } else if (date.getFullYear() === financialYearEnd && date.getMonth() < 3) {
        fyExpenses += exp.amount;
      }
    });
    
    allIncomes.forEach(inc => {
      const date = new Date(inc.date);
      if (date.getFullYear() === financialYearStart && date.getMonth() >= 3) {
        fyIncome += inc.amount;
      } else if (date.getFullYear() === financialYearEnd && date.getMonth() < 3) {
        fyIncome += inc.amount;
      }
    });
    
    setFinancialYearData({
      startYear: financialYearStart,
      endYear: financialYearEnd,
      expenses: fyExpenses,
      income: fyIncome,
      savings: fyIncome - fyExpenses,
      savingsRate: fyIncome > 0 ? ((fyIncome - fyExpenses) / fyIncome) * 100 : 0
    });
    
    // Calculate budget progress and goals
    calculateBudgetProgress(members);
  };

  const handleSetHouseholdBudget = async (budgetData: Partial<HouseholdBudget>) => {
    if (!user || !userData?.householdId || !userData?.isAdmin) return;
    
    try {
      setLoading(true);
      await FirestoreService.setHouseholdBudget(userData.householdId, {
        ...budgetData,
        createdBy: user.uid
      });
      
      // Refresh budget data
      const updatedBudget = await FirestoreService.getHouseholdBudget(userData.householdId);
      setHouseholdBudget(updatedBudget);
      setShowBudgetDialog(false);
      
      toast({
        title: "Budget Set!",
        description: "Household budget has been updated successfully.",
      });
    } catch (error: any) {
      console.error('Error setting household budget:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to set household budget. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBudgetDialog = () => {
    // Initialize temporary budget with current values or defaults
    setTempBudget({
      monthlyBudget: householdBudget?.monthlyBudget || 0,
      description: householdBudget?.description || ''
    });
    setShowBudgetDialog(true);
  };

  const handleOpenGoalDialog = () => {
    // Initialize temporary goal with defaults
    setTempGoal({
      title: '',
      description: '',
      type: 'savings',
      targetAmount: 0,
      monthlyTarget: 0,
      weeklyTarget: 0,
      dailyTarget: 0
    });
    setShowGoalDialog(true);
  };

  const handleSetBudgetGoal = async (goalData: Partial<BudgetGoal>) => {
    if (!user || !userData?.householdId || !userData?.isAdmin) return;
    
    try {
      setLoading(true);
      await FirestoreService.setBudgetGoal(userData.householdId, {
        ...goalData,
        createdBy: user.uid
      });
      
      // Refresh goals data
      const updatedGoals = await FirestoreService.getHouseholdGoals(userData.householdId);
      setBudgetGoals(updatedGoals);
      setShowGoalDialog(false);
      
      toast({
        title: "Goal Set!",
        description: "New budget goal has been added successfully.",
      });
    } catch (error: any) {
      console.error('Error setting budget goal:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to set budget goal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateBudgetProgress = (members: UserData[]) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentDate = now.getDate();
    const currentWeek = Math.ceil(currentDate / 7);
    
    // Get current month expenses and income
    let currentMonthExpenses = 0;
    let currentMonthIncome = 0;
    
    members.forEach(member => {
      const memberExpenses = member.expenses?.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
      }).reduce((sum, exp) => sum + exp.amount, 0) || 0;
      
      const memberIncome = member.incomes?.filter(inc => {
        const incDate = new Date(inc.date);
        return incDate.getMonth() === currentMonth && incDate.getFullYear() === currentYear;
      }).reduce((sum, inc) => sum + inc.amount, 0) || 0;
      
      currentMonthExpenses += memberExpenses;
      currentMonthIncome += memberIncome;
    });
    
    // Calculate weekly and daily averages
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const weeksInMonth = Math.ceil(daysInMonth / 7);
    
    const dailyExpenseAverage = currentMonthExpenses / currentDate;
    const weeklyExpenseAverage = currentMonthExpenses / currentWeek;
    const monthlyExpenseAverage = currentMonthExpenses;
    
    const dailyIncomeAverage = currentMonthIncome / currentDate;
    const weeklyIncomeAverage = currentMonthIncome / currentWeek;
    const monthlyIncomeAverage = currentMonthIncome;
    
    // Calculate projections
    const projectedMonthlyExpenses = dailyExpenseAverage * daysInMonth;
    const projectedMonthlyIncome = dailyIncomeAverage * daysInMonth;
    
    // Calculate savings rate
    const currentSavings = currentMonthIncome - currentMonthExpenses;
    const projectedSavings = projectedMonthlyIncome - projectedMonthlyExpenses;
    
    setBudgetProgress({
      current: {
        daily: { expenses: dailyExpenseAverage, income: dailyIncomeAverage },
        weekly: { expenses: weeklyExpenseAverage, income: weeklyIncomeAverage },
        monthly: { expenses: monthlyExpenseAverage, income: monthlyIncomeAverage }
      },
      projected: {
        monthly: { expenses: projectedMonthlyExpenses, income: projectedMonthlyIncome, savings: projectedSavings }
      },
      averages: {
        daily: dailyExpenseAverage,
        weekly: weeklyExpenseAverage,
        monthly: monthlyExpenseAverage
      },
      savings: {
        current: currentSavings,
        projected: projectedSavings,
        rate: currentMonthIncome > 0 ? (currentSavings / currentMonthIncome) * 100 : 0
      }
    });
  };

  const loadBudgetAndGoalsData = async (householdId: string) => {
    try {
      // Load budget data
      const budget = await FirestoreService.getHouseholdBudget(householdId);
      setHouseholdBudget(budget);
      
      // Load goals data
      const goals = await FirestoreService.getHouseholdGoals(householdId);
      setBudgetGoals(goals);
    } catch (error) {
      console.error('Error loading budget and goals data:', error);
    }
  };

  const handleLeaveHousehold = async () => {
    if (!user) return;
    
    try {
      await FirestoreService.leaveHousehold(user.uid);
      toast({
        title: "Left household",
        description: "You have successfully left the household.",
      });
      // Force a page refresh to update the navbar state
      window.location.href = '/';
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to leave household",
        variant: "destructive",
      });
    }
  };

  const handleRefreshData = async () => {
    if (!user || !userData?.householdId) return;
    
    try {
      setLoading(true);
      // Force a fresh fetch from Firestore
      const freshData = await FirestoreService.getHouseholdData(userData.householdId);
      
      setHouseholdMembers(freshData);
      calculateAggregatedFinances(freshData);
      
      // Also calculate reports data
      if (freshData.length > 0) {
        calculateReportsData(freshData);
      }
      
      toast({
        title: "Data Refreshed",
        description: "Household data has been updated.",
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Refresh failed",
        description: "Failed to refresh household data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };



  // Function to force refresh household data (can be called from other components)
  const forceRefreshHouseholdData = async () => {
    if (!user || !userData?.householdId) return;
    
    try {
      setLoading(true);

      
      // Get fresh data directly instead of calling loadHouseholdData
      const freshHouseholdData = await FirestoreService.getHouseholdData(userData.householdId);
      setHouseholdMembers(freshHouseholdData);
      calculateAggregatedFinances(freshHouseholdData);
      
      // Also calculate reports data
      if (freshHouseholdData.length > 0) {
        calculateReportsData(freshHouseholdData);
      }
      
      toast({
        title: "Data Refreshed",
        description: "Household data has been manually refreshed.",
      });
    } catch (error) {
      console.error('Error force refreshing data:', error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh household data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHousehold = async () => {
    if (!user || !householdName.trim()) {
      return;
    }
    
    setLoading(true);
    try {
      await FirestoreService.createHousehold(
        householdName.trim(), 
        user.uid, 
        user.email || undefined, 
        user.displayName || undefined
      );
      toast({
        title: "Household Created!",
        description: "Your household has been created successfully. You are now the admin.",
      });
      
      setShowCreateDialog(false);
      setHouseholdName('');
      
      // Reload household data
      await loadHouseholdData();
    } catch (error: any) {
      console.error('❌ Error creating household:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create household. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinHousehold = async () => {
    console.log('🔧 Join household button clicked');
    console.log('👤 User:', user);
    console.log('🏠 Join household name:', joinHouseholdName);
    
    if (!user || !joinHouseholdName.trim()) {
      console.log('❌ Validation failed:', { user: !!user, joinHouseholdName: joinHouseholdName.trim() });
      return;
    }
    
    setLoading(true);
    try {
      // First find the household by name
      const householdId = await FirestoreService.findHouseholdByName(joinHouseholdName.trim());
      
      if (!householdId) {
        toast({
          title: "Household Not Found",
          description: "No household found with that name. Please check the name and try again.",
          variant: "destructive",
      });
        return;
      }
      
      // Send join request
      await FirestoreService.sendJoinRequest(
        householdId, 
        user.uid, 
        user.email || '', 
        user.displayName || undefined
      );
      toast({
        title: "Join Request Sent!",
        description: "Your request has been sent to the household admin. You'll be notified when it's approved or rejected.",
      });
      
      setShowJoinDialog(false);
      setJoinHouseholdName('');
    } catch (error: any) {
      console.error('❌ Error sending join request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send join request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };



  // Check if user is not authenticated (guest user)
  if (!user) {
    return (
      <div className="flex-1 flex flex-col bg-background px-4 md:px-8 py-6 md:py-8 container mx-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-6">
            <Users className="mx-auto h-24 w-24 text-primary" />
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold">Household Finance Management</h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Collaborate with family members to track expenses, manage budgets, and achieve financial goals together.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => router.push('/auth')} size="lg" className="text-lg px-8 py-6">
                <User className="mr-2 h-5 w-5" />
                Get Started - Sign Up Free
              </Button>
              <Button variant="outline" onClick={() => router.push('/')} size="lg" className="text-lg px-8 py-6">
                <Home className="mr-2 h-5 w-5" />
                Explore Dashboard
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="bg-primary/10 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Family Collaboration</h3>
              <p className="text-muted-foreground">
                Invite family members to join your household and share financial responsibilities.
              </p>
            </Card>

            {/* Feature 2 */}
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Shared Budgets</h3>
              <p className="text-muted-foreground">
                Set and track household budgets together with real-time updates and notifications.
              </p>
            </Card>

            {/* Feature 3 */}
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <DollarSign className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Expense Tracking</h3>
              <p className="text-muted-foreground">
                Monitor household expenses with detailed categorization and spending insights.
              </p>
            </Card>

            {/* Feature 4 */}
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="bg-purple-100 dark:bg-purple-900/20 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Calendar className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Monthly Reports</h3>
              <p className="text-muted-foreground">
                Get comprehensive monthly financial reports and track progress over time.
              </p>
            </Card>

            {/* Feature 5 */}
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Settings className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Admin Controls</h3>
              <p className="text-muted-foreground">
                Manage household members, transfer admin roles, and control access permissions.
              </p>
            </Card>

            {/* Feature 6 */}
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="bg-red-100 dark:bg-red-900/20 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <RefreshCw className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-time Sync</h3>
              <p className="text-muted-foreground">
                All household data syncs in real-time across all family members' devices.
              </p>
            </Card>
          </div>

          {/* Benefits Section */}
          <Card className="p-8 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold">Why Choose Household Finance Management?</h2>
              <div className="grid md:grid-cols-2 gap-6 text-left">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="font-medium">Transparency in family finances</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="font-medium">Shared financial goals and accountability</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="font-medium">Better budget planning and control</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="font-medium">Reduced financial stress and conflicts</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="font-medium">Improved financial literacy for all members</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="font-medium">Secure and private family data</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Final CTA */}
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">Ready to Get Started?</h2>
            <p className="text-muted-foreground">
              Join thousands of families who are already managing their finances together.
            </p>
            <Button onClick={() => router.push('/auth')} size="lg" className="text-lg px-8 py-6">
              <User className="mr-2 h-5 w-5" />
              Create Your Household Today
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-background px-4 md:px-8 py-6 md:py-8 container mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Loading household data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!userData?.householdId) {
    return (
      <div className="flex-1 flex flex-col bg-background px-4 md:px-8 py-6 md:py-8 container mx-auto">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <Users className="mx-auto h-24 w-24 text-primary" />
            <h1 className="text-3xl font-bold">Join or Create a Household</h1>
            <p className="text-xl text-muted-foreground">
              Collaborate with family members to track expenses, manage budgets, and achieve financial goals together.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Create Household Card */}
            <Card className="p-6 text-center hover:shadow-lg transition-shadow border-2 border-dashed border-primary/30">
              <div className="bg-primary/10 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Plus className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Create New Household</h3>
              <p className="text-muted-foreground mb-6">
                Start a new household and invite family members to join. You'll be the admin with full control.
              </p>
              <Button 
                onClick={() => {
                  console.log('🔧 Create button clicked, setting showCreateDialog to true');
                  setShowCreateDialog(true);
                }} 
                size="lg" 
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Household
              </Button>
            </Card>

            {/* Join Household Card */}
            <Card className="p-6 text-center hover:shadow-lg transition-shadow border-2 border-dashed border-secondary/30">
              <div className="bg-secondary/10 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Join Existing Household</h3>
              <p className="text-muted-foreground mb-6">
                Join an existing household by entering the household name. Your request will be sent to the admin.
              </p>
              <Button 
                onClick={() => setShowJoinDialog(true)}
                variant="outline" 
                size="lg" 
                className="w-full"
              >
                <Users className="mr-2 h-4 w-4" />
                Join Household
              </Button>
            </Card>
          </div>

          <div className="pt-6 border-t border-border/30">
            <Button variant="ghost" onClick={() => router.push('/')} className="text-muted-foreground">
              <Home className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
          

        </div>
        




        {/* Create Household Dialog */}
        {showCreateDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Create New Household</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="householdName" className="block text-sm font-medium mb-2">
                    Household Name
                  </label>
                  <input
                    id="householdName"
                    type="text"
                    placeholder="Enter household name"
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary mobile-input"
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <Button 
                    onClick={handleCreateHousehold} 
                    className="flex-1"
                    disabled={!householdName.trim()}
                  >
                    Create
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Join Household Dialog */}
        {showJoinDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Join Existing Household</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="joinHouseholdName" className="block text-sm font-medium mb-2">
                    Household Name
                  </label>
                  <input
                    id="joinHouseholdName"
                    type="text"
                    placeholder="Enter household name"
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary mobile-input"
                    value={joinHouseholdName}
                    onChange={(e) => setJoinHouseholdName(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <Button 
                    onClick={handleJoinHousehold} 
                    className="flex-1"
                    disabled={!joinHouseholdName.trim()}
                  >
                    Send Request
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowJoinDialog(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }



  return (
    <div 
      className="flex-1 flex flex-col bg-background px-4 md:px-8 py-6 md:py-8 container mx-auto"
    >

      <header className="mb-6 md:mb-8">
        <div className="space-y-4">
          {/* Title and info section */}
          <div>
            <h1 className="text-3xl font-bold">{household?.name || "Household"}</h1>
            <p className="text-muted-foreground">
              {householdMembers.length} member{householdMembers.length !== 1 ? 's' : ''} • 
              {userData?.isAdmin ? ' You are the admin' : ' Member'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          
          {/* Actions Menu - Collapsible */}
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsActionsExpanded(!isActionsExpanded)}
              className="flex items-center justify-between w-full sm:w-auto"
            >
              <span className="flex items-center gap-2">
                <MoreHorizontal className="h-4 w-4" />
                Actions
              </span>
              {isActionsExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            
            {isActionsExpanded && (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 p-3 bg-muted/50 rounded-lg border border-border/30">
                <Button variant="outline" size="sm" onClick={handleRefreshData} className="flex-1 sm:flex-none">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Data
                </Button>
                <Button variant="outline" size="sm" onClick={forceRefreshHouseholdData} className="flex-1 sm:flex-none">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Force Refresh
                </Button>
                <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none">
                  <Link href="/household/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={handleLeaveHousehold} className="flex-1 sm:flex-none">
                  <LogOut className="mr-2 h-4 w-4" />
                  Leave
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <Tabs value={view} onValueChange={(value) => setView(value as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Home className="h-4 w-4 md:hidden" />
            <span className="hidden md:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <Calendar className="h-4 w-4 md:hidden" />
            <span className="hidden md:inline">Monthly</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 md:hidden" />
            <span className="hidden md:inline">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="budget" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 md:hidden" />
            <span className="hidden md:inline">Budget & Goals</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4 md:hidden" />
            <span className="hidden md:inline">Members</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Financial totals */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{totalExpenses.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  All time household expenses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{totalIncome.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  All time household income
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${totalSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{totalSavings.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  All time household savings
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Additional financial insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Month Overview</CardTitle>
                <CardDescription>
                  Financial summary for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Monthly Expenses:</span>
                  <span className="text-lg font-bold text-red-600">₹{monthlyExpenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Monthly Income:</span>
                  <span className="text-lg font-bold text-green-600">₹{monthlyIncome.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-sm font-medium">Monthly Savings:</span>
                  <span className={`text-lg font-bold ${monthlySavings >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    ₹{monthlySavings.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Household Summary</CardTitle>
                <CardDescription>
                  Overall financial health indicators
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Members:</span>
                  <span className="text-lg font-bold">{householdMembers.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Avg. Monthly Expenses:</span>
                  <span className="text-lg font-bold text-red-600">
                    ₹{householdMembers.length > 0 ? Math.round(monthlyExpenses / householdMembers.length).toLocaleString() : '0'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Savings Rate:</span>
                  <span className={`text-lg font-bold ${totalIncome > 0 ? (totalSavings / totalIncome * 100 >= 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-600'}`}>
                    {totalIncome > 0 ? (totalSavings / totalIncome * 100).toFixed(1) : '0'}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Debug information - show actual data counts */}
          <Card className="bg-muted border border-muted-foreground/10 dark:bg-muted/60 dark:border-muted-foreground/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="bg-muted-foreground/10 dark:bg-muted-foreground/20 p-2 rounded-full">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground">Household Members</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsDebugExpanded(!isDebugExpanded)}
                      className="h-6 w-6 p-0 hover:bg-muted-foreground/10"
                    >
                      {isDebugExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {isDebugExpanded && (
                    <div className="text-sm text-muted-foreground mt-2 space-y-1">
                      <p>Household Members: {householdMembers.length}</p>
                      {householdMembers.map((member, index) => (
                        <div
                          key={member.id || index}
                          className="ml-4 border-l-2 border-muted-foreground/20 dark:border-muted-foreground/30 pl-2"
                        >
                          <p className="font-medium">{member.displayName || member.email || `Member ${index + 1}`}</p>
                          <p>Expenses: {member.expenses?.length || 0} | Income: {member.incomes?.length || 0}</p>
                          <p>
                            Total Expenses: ₹
                            {member.expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0}
                          </p>
                          <p>
                            Total Income: ₹
                            {member.incomes?.reduce((sum, inc) => sum + inc.amount, 0) || 0}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info about data aggregation */}
          <Card className="bg-primary/10 border border-primary/20 dark:bg-primary/20 dark:border-primary/40 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="bg-primary/20 p-2 rounded-full transition-colors">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-primary-foreground/90 dark:text-primary-foreground/80">
                    Historical Data Included
                  </h3>
                  <p className="text-sm text-primary/80 dark:text-primary-foreground/70 mt-1">
                    All household totals include historical data from before joining, including imported data from backups.
                    The figures below represent the complete financial picture for all household members.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month's Expenses</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{monthlyExpenses.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Current month expenses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month's Income</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{monthlyIncome.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Current month income
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month's Savings</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${monthlySavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{monthlySavings.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Current month savings
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          {/* Reports Header */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Financial Reports & Analytics</h2>
            <p className="text-muted-foreground">
              {monthlyComparisons.length > 0 || yearlyComparisons.length > 0 
                ? "Smart month-to-date comparisons and annual financial analysis"
                : "Reports will be available once you have data from at least 2 months"}
            </p>
          </div>

          {/* Month-over-Month Analysis */}
          {monthlyComparisons.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Month-to-Date Analysis
                </CardTitle>
                <CardDescription>
                  {monthlyComparisons[0]?.comparisonType || "Compare current month vs previous month"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monthlyComparisons.map((comparison, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{comparison.monthName}</h4>
                          <p className="text-sm text-muted-foreground">
                            vs {comparison.previousMonthName} (same date range)
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={comparison.isExpenseIncrease ? "destructive" : "default"}>
                            {comparison.isExpenseIncrease ? "↗" : "↘"} Expenses: {comparison.expenseChange.toFixed(1)}%
                          </Badge>
                          <Badge variant={comparison.isIncomeIncrease ? "default" : "secondary"}>
                            {comparison.isIncomeIncrease ? "↗" : "↘"} Income: {comparison.incomeChange.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Current Month Data */}
                      <div className="mb-4">
                        <h5 className="font-medium text-sm mb-2 text-blue-600">Current Month (1-{new Date().getDate()})</h5>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Expenses</p>
                            <p className="font-semibold text-red-600">₹{comparison.expenses.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Income</p>
                            <p className="font-semibold text-green-600">₹{comparison.income.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Savings</p>
                            <p className={`font-semibold ${comparison.savings >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                              ₹{comparison.savings.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Previous Month Comparison */}
                      <div className="border-t pt-3">
                        <h5 className="font-medium text-sm mb-2 text-muted-foreground">Previous Month (1-{new Date().getDate()})</h5>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Expenses</p>
                            <p className="font-semibold text-red-600">₹{comparison.previousMonthExpenses?.toLocaleString() || '0'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Income</p>
                            <p className="font-semibold text-green-600">₹{comparison.previousMonthIncome?.toLocaleString() || '0'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Savings</p>
                            <p className={`font-semibold ${(comparison.previousMonthIncome - comparison.previousMonthExpenses) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                              ₹{((comparison.previousMonthIncome || 0) - (comparison.previousMonthExpenses || 0)).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Year-over-Year Analysis */}
          {yearlyComparisons.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Year-over-Year Analysis
                </CardTitle>
                <CardDescription>
                  Compare annual financial performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {yearlyComparisons.map((comparison, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-lg">{comparison.year}</h4>
                        <div className="flex gap-2">
                          <Badge variant={comparison.isExpenseIncrease ? "destructive" : "default"}>
                            {comparison.isExpenseIncrease ? "↗" : "↘"} Expenses: {comparison.expenseChange.toFixed(1)}%
                          </Badge>
                          <Badge variant={comparison.isIncomeIncrease ? "default" : "secondary"}>
                            {comparison.isIncomeIncrease ? "↗" : "↘"} Income: {comparison.incomeChange.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-muted-foreground text-sm">Expenses</p>
                          <p className="font-semibold text-red-600 text-lg">₹{comparison.expenses.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Income</p>
                          <p className="font-semibold text-green-600 text-lg">₹{comparison.income.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Savings</p>
                          <p className={`font-semibold text-lg ${comparison.savings >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            ₹{comparison.savings.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Financial Year Summary */}
          {financialYearData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Year Summary ({financialYearData.startYear}-{financialYearData.endYear})
                </CardTitle>
                <CardDescription>
                  April {financialYearData.startYear} to March {financialYearData.endYear}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <p className="text-muted-foreground text-sm">Total Expenses</p>
                    <p className="font-bold text-red-600 text-2xl">₹{financialYearData.expenses.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground text-sm">Total Income</p>
                    <p className="font-bold text-green-600 text-2xl">₹{financialYearData.income.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground text-sm">Net Savings</p>
                    <p className={`font-bold text-2xl ${financialYearData.savings >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      ₹{financialYearData.savings.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground text-sm">Savings Rate</p>
                    <p className={`font-bold text-2xl ${financialYearData.savingsRate >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {financialYearData.savingsRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
                
                {/* Progress bar for savings rate */}
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Savings Rate Progress</span>
                    <span className="text-sm text-muted-foreground">{financialYearData.savingsRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-300 ${
                        financialYearData.savingsRate >= 0 ? 'bg-blue-600' : 'bg-red-600'
                      }`}
                      style={{ 
                        width: `${Math.min(Math.abs(financialYearData.savingsRate), 100)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Data Message */}
          {monthlyComparisons.length === 0 && yearlyComparisons.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <div className="space-y-4">
                  <TrendingUp className="mx-auto h-16 w-16 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold">No Reports Available Yet</h3>
                    <p className="text-muted-foreground">
                      Reports require data from at least 2 months to generate meaningful comparisons.
                      <br />
                      Continue adding expenses and income to see detailed financial analytics.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="budget" className="space-y-6">
          {/* Budget & Goals Header */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Budget & Financial Goals</h2>
            <p className="text-muted-foreground">
              Set household budgets, track progress, and achieve financial goals together
            </p>
          </div>

          {/* Admin Actions */}
          {userData?.isAdmin && (
            <div className="flex justify-center gap-4">
              <Button 
                onClick={handleOpenBudgetDialog}
                className="flex items-center gap-2"
              >
                <DollarSign className="h-4 w-4" />
                Set Budget
              </Button>
              <Button 
                onClick={handleOpenGoalDialog}
                className="flex items-center gap-2"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
                Add Goal
              </Button>
            </div>
          )}

          {/* Current Budget Status */}
          {householdBudget && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Current Budget Status
                </CardTitle>
                <CardDescription>
                  Monthly budget: ₹{householdBudget.monthlyBudget?.toLocaleString() || '0'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-muted-foreground text-sm">Monthly Budget</p>
                    <p className="font-bold text-blue-600 text-2xl">
                      ₹{householdBudget.monthlyBudget?.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground text-sm">Monthly Spent</p>
                    <p className="font-bold text-red-600 text-2xl">
                      ₹{monthlyExpenses.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground text-sm">Remaining</p>
                    <p className={`font-bold text-2xl ${
                      (householdBudget.monthlyBudget || 0) - monthlyExpenses >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      ₹{((householdBudget.monthlyBudget || 0) - monthlyExpenses).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {/* Budget Progress Bar */}
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Budget Usage</span>
                    <span className="text-sm text-muted-foreground">
                      {householdBudget.monthlyBudget ? 
                        Math.round((monthlyExpenses / householdBudget.monthlyBudget) * 100) : 0
                      }%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-300 ${
                        (householdBudget.monthlyBudget || 0) - monthlyExpenses >= 0 
                          ? 'bg-green-600' 
                          : 'bg-red-600'
                      }`}
                      style={{ 
                        width: `${Math.min(
                          householdBudget.monthlyBudget ? 
                            (monthlyExpenses / householdBudget.monthlyBudget) * 100 : 0, 
                          100
                        )}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}



          {/* Budget Progress Analytics */}
          {budgetProgress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Budget Progress Analytics
                </CardTitle>
                <CardDescription>
                  Real-time tracking of spending patterns and projections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Daily Averages */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-center">Daily Averages</h4>
                    <div className="text-center">
                      <p className="text-muted-foreground text-sm">Expenses</p>
                      <p className="font-bold text-red-600 text-xl">
                        ₹{budgetProgress.current.daily.expenses.toFixed(0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground text-sm">Income</p>
                      <p className="font-bold text-green-600 text-xl">
                        ₹{budgetProgress.current.daily.income.toFixed(0)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Weekly Averages */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-center">Weekly Averages</h4>
                    <div className="text-center">
                      <p className="text-muted-foreground text-sm">Expenses</p>
                      <p className="font-bold text-red-600 text-xl">
                        ₹{budgetProgress.current.weekly.expenses.toFixed(0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground text-sm">Income</p>
                      <p className="font-bold text-green-600 text-xl">
                        ₹{budgetProgress.current.weekly.income.toFixed(0)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Monthly Projections */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-center">Monthly Projections</h4>
                    <div className="text-center">
                      <p className="text-muted-foreground text-sm">Expenses</p>
                      <p className="font-bold text-red-600 text-xl">
                        ₹{budgetProgress.projected.monthly.expenses.toFixed(0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground text-sm">Savings</p>
                      <p className={`font-bold text-xl ${
                        budgetProgress.projected.monthly.savings >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ₹{budgetProgress.projected.monthly.savings.toFixed(0)}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Savings Rate */}
                <div className="mt-6 pt-6 border-t">
                  <div className="text-center">
                    <h4 className="font-semibold mb-2">Current Savings Rate</h4>
                    <p className={`text-3xl font-bold ${
                      budgetProgress.savings.rate >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {budgetProgress.savings.rate.toFixed(1)}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {budgetProgress.savings.current >= 0 ? 'Positive' : 'Negative'} savings this month
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Financial Goals */}
          {budgetGoals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Financial Goals
                </CardTitle>
                <CardDescription>
                  Track progress towards your household financial objectives
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {budgetGoals.map((goal) => (
                    <div key={goal.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{goal.title}</h4>
                          {goal.description && (
                            <p className="text-sm text-muted-foreground">{goal.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {goal.type.charAt(0).toUpperCase() + goal.type.slice(1)}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {goal.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Target</p>
                          <p className="font-bold text-lg">₹{goal.targetAmount.toLocaleString()}</p>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-muted-foreground">Progress</span>
                          <span className="text-sm font-medium">
                            {Math.round((goal.currentAmount / goal.targetAmount) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* Goal Details */}
                      <div className="grid grid-cols-3 gap-4 text-center text-sm">
                        <div>
                          <p className="text-sm text-muted-foreground">Monthly Target</p>
                          <p className="font-semibold">₹{goal.monthlyTarget.toFixed(0)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Weekly Target</p>
                          <p className="font-semibold">₹{goal.weeklyTarget.toFixed(0)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Daily Target</p>
                          <p className="font-semibold">₹{goal.dailyTarget.toFixed(0)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Budget Set Message */}
          {!householdBudget && (
            <Card className="text-center py-12">
              <CardContent>
                <div className="space-y-4">
                  <DollarSign className="mx-auto h-16 w-16 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold">No Budget Set Yet</h3>
                    <p className="text-muted-foreground">
                      {userData?.isAdmin 
                        ? "Set a household budget to start tracking spending and achieving financial goals."
                        : "Ask your household admin to set up a budget and financial goals."
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Household Members</CardTitle>
              <CardDescription>
                {householdMembers.length} member{householdMembers.length !== 1 ? 's' : ''} in this household
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {householdMembers.map((member, index) => {
                  const memberTotalExpenses = member.expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
                  const memberTotalIncome = member.incomes?.reduce((sum, inc) => sum + inc.amount, 0) || 0;
                  const memberTotalSavings = memberTotalIncome - memberTotalExpenses;
                  
                  return (
                    <div key={`${member.email || member.householdId}-${index}`} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {member.displayName?.[0]?.toUpperCase() || member.email?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">
                              {member.displayName || member.email || "Unknown User"}
                            </p>
                            {member.isAdmin && (
                              <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700">
                                <Crown className="h-3 w-3" />
                                Admin
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs font-bold text-muted-foreground">
                            {member.email}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 ml-13">
                        <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
                          <span className="text-xs font-medium">Expenses:</span> ₹{memberTotalExpenses.toLocaleString()}
                        </Badge>
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                          <span className="text-xs font-medium">Income:</span> ₹{memberTotalIncome.toLocaleString()}
                        </Badge>
                        <Badge variant={memberTotalSavings >= 0 ? "default" : "destructive"} className="text-sm">
                          <span className="text-xs font-medium">Savings:</span> ₹{memberTotalSavings.toLocaleString()}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          
          {/* Financial breakdown summary */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Breakdown</CardTitle>
              <CardDescription>
                How each member contributes to household finances
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {householdMembers.map((member, index) => {
                  const memberTotalExpenses = member.expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
                  const memberTotalIncome = member.incomes?.reduce((sum, inc) => sum + inc.amount, 0) || 0;
                  const expensePercentage = totalExpenses > 0 ? (memberTotalExpenses / totalExpenses * 100).toFixed(1) : '0';
                  const incomePercentage = totalIncome > 0 ? (memberTotalIncome / totalIncome * 100).toFixed(1) : '0';
                  
                  return (
                    <div key={`${member.email || member.householdId}-${index}`} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {member.displayName?.[0]?.toUpperCase() || member.email?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-medium">
                          {member.displayName || member.email || "Unknown User"}
                        </p>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Expenses:</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-red-600">₹{memberTotalExpenses.toLocaleString()}</span>
                            <span className="text-xs text-muted-foreground">({expensePercentage}%)</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Income:</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-green-600">₹{memberTotalIncome.toLocaleString()}</span>
                            <span className="text-xs text-muted-foreground">({incomePercentage}%)</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Income Contribution:</span>
                            <span className="text-xs text-muted-foreground">{incomePercentage}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${totalIncome > 0 ? (memberTotalIncome / totalIncome * 100) : 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Set Household Budget Dialog */}
      {showBudgetDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Set Budget</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="monthlyBudget" className="block text-sm font-medium mb-2">
                  Monthly Budget (₹)
                </label>
                <input
                  id="monthlyBudget"
                  type="number"
                  placeholder="Enter monthly budget amount"
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary mobile-input"
                  value={tempBudget.monthlyBudget || ''}
                  onChange={(e) => setTempBudget(prev => ({ 
                    ...prev, 
                    monthlyBudget: parseFloat(e.target.value) || 0 
                  }))}
                />
              </div>
              <div>
                <label htmlFor="budgetDescription" className="block text-sm font-medium mb-2">
                  Budget Description (Optional)
                </label>
                <textarea
                  id="budgetDescription"
                  placeholder="Describe your budget strategy or categories"
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary mobile-input"
                  rows={3}
                  value={tempBudget.description || ''}
                  onChange={(e) => setTempBudget(prev => ({ 
                    ...prev, 
                    description: e.target.value 
                  }))}
                />
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={() => handleSetHouseholdBudget(tempBudget)} 
                  className="flex-1"
                  disabled={!tempBudget.monthlyBudget || tempBudget.monthlyBudget <= 0}
                >
                  Set Budget
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowBudgetDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Financial Goal Dialog */}
      {showGoalDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Goal</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="goalTitle" className="block text-sm font-medium mb-2">
                  Goal Title
                </label>
                <input
                  id="goalTitle"
                  type="text"
                  placeholder="e.g., Save for vacation, Emergency fund"
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary mobile-input"
                  value={tempGoal.title || ''}
                  onChange={(e) => setTempGoal(prev => ({ 
                    ...prev, 
                    title: e.target.value 
                  }))}
                />
              </div>
              <div>
                <label htmlFor="goalDescription" className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  id="goalDescription"
                  placeholder="Describe your financial goal"
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary mobile-input"
                  rows={2}
                  value={tempGoal.description || ''}
                  onChange={(e) => setTempGoal(prev => ({ 
                    ...prev, 
                    description: e.target.value 
                  }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="goalType" className="block text-sm font-medium mb-2">
                    Goal Type
                  </label>
                  <select
                    id="goalType"
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary mobile-input"
                    value={tempGoal.type || 'savings'}
                    onChange={(e) => setTempGoal(prev => ({ 
                      ...prev, 
                      type: e.target.value as 'savings' | 'debt' | 'investment' | 'expense' 
                    }))}
                  >
                    <option value="savings">Savings</option>
                    <option value="debt">Debt Reduction</option>
                    <option value="investment">Investment</option>
                    <option value="expense">Expense Control</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="goalTargetAmount" className="block text-sm font-medium mb-2">
                    Target Amount (₹)
                  </label>
                  <input
                    id="goalTargetAmount"
                    type="number"
                    placeholder="Total goal amount"
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary mobile-input"
                    value={tempGoal.targetAmount || ''}
                    onChange={(e) => {
                      const amount = parseFloat(e.target.value) || 0;
                      const monthlyTarget = amount / 12;
                      const weeklyTarget = amount / 52;
                      const dailyTarget = amount / 365;
                      
                      setTempGoal(prev => ({ 
                        ...prev, 
                        targetAmount: amount,
                        monthlyTarget,
                        weeklyTarget,
                        dailyTarget
                      }));
                    }}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={() => {
                    if (tempGoal.title && tempGoal.targetAmount) {
                      handleSetBudgetGoal(tempGoal);
                    }
                  }} 
                  className="flex-1"
                  disabled={!tempGoal.title || !tempGoal.targetAmount}
                >
                  Add Goal
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowGoalDialog(false);
                    setTempGoal({});
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
