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
  User
} from "lucide-react";
import { FirestoreService, UserData, Household } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";

export default function HouseholdPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [householdMembers, setHouseholdMembers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"overview" | "monthly" | "members">("overview");
  
  // Aggregated financial data
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isDebugExpanded, setIsDebugExpanded] = useState(false);
  const [isActionsExpanded, setIsActionsExpanded] = useState(false);
  
  // Calculated values
  const totalSavings = totalIncome - totalExpenses;
  const monthlySavings = monthlyIncome - monthlyExpenses;

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    loadHouseholdData();
  }, [user, router]);

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
          console.log('🔄 Household data has changed, silently refreshing...');
          // Update state without showing toast
          setHouseholdMembers(freshHouseholdData);
          calculateAggregatedFinances(freshHouseholdData);
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
        console.log('🏠 Loading household data for householdId:', data.householdId);
        
        // Load household data
        const householdData = await FirestoreService.getHouseholdData(data.householdId);
        console.log('👥 Household members data loaded:', householdData);
        setHouseholdMembers(householdData);
        
        // Load household details
        const householdDoc = await FirestoreService.getHousehold(data.householdId);
        console.log('🏠 Household document loaded:', householdDoc);
        setHousehold(householdDoc);
        
        // Calculate aggregated financial data
        console.log('🧮 Starting financial aggregation...');
        console.log('📊 Household members data for aggregation:', householdData.map(m => ({
          id: m.id,
          displayName: m.displayName,
          expensesCount: m.expenses?.length || 0,
          incomesCount: m.incomes?.length || 0,
          totalExpenses: m.expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0,
          totalIncome: m.incomes?.reduce((sum, inc) => sum + inc.amount, 0) || 0
        })));
        calculateAggregatedFinances(householdData);
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
    console.log('🔍 Calculating aggregated finances for members:', members);
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let totalExp = 0;
    let totalInc = 0;
    let monthlyExp = 0;
    let monthlyInc = 0;
    
    members.forEach((member, index) => {
      console.log(`👤 Member ${index + 1}:`, {
        id: member.id,
        email: member.email,
        displayName: member.displayName,
        expensesCount: member.expenses?.length || 0,
        incomesCount: member.incomes?.length || 0,
        expenses: member.expenses?.slice(0, 3), // Show first 3 expenses
        incomes: member.incomes?.slice(0, 3),   // Show first 3 incomes
      });
      
      // Calculate total expenses and income
      const memberExpenses = member.expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
      const memberIncome = member.incomes?.reduce((sum, inc) => sum + inc.amount, 0) || 0;
      
      console.log(`💰 Member ${index + 1} totals:`, {
        expenses: memberExpenses,
        income: memberIncome
      });
      
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
    
    console.log('📊 Final aggregated totals:', {
      totalExpenses: totalExp,
      totalIncome: totalInc,
      monthlyExpenses: monthlyExp,
      monthlyIncome: monthlyInc
    });
    
    setTotalExpenses(totalExp);
    setTotalIncome(totalInc);
    setMonthlyExpenses(monthlyExp);
    setMonthlyIncome(monthlyInc);
    setLastUpdated(new Date());
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
      console.log('🔄 Manually refreshing household data...');
      
      // Force a fresh fetch from Firestore
      const freshData = await FirestoreService.getHouseholdData(userData.householdId);
      console.log('🆕 Fresh household data fetched:', freshData);
      
      setHouseholdMembers(freshData);
      calculateAggregatedFinances(freshData);
      
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
      console.log('🔄 Force refreshing household data...');
      
      // Get fresh data directly instead of calling loadHouseholdData
      const freshHouseholdData = await FirestoreService.getHouseholdData(userData.householdId);
      setHouseholdMembers(freshHouseholdData);
      calculateAggregatedFinances(freshHouseholdData);
      
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



  // Check if user is not authenticated (guest user)
  if (!user) {
    return (
      <div className="flex-1 flex flex-col bg-background px-4 md:px-8 py-6 md:py-8 container mx-auto">
        <div className="text-center space-y-6">
          <Users className="mx-auto h-20 w-20 text-muted-foreground" />
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Household Feature</h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Sign in to access household features and collaborate with family members on finances.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => router.push('/auth')} size="lg">
              <User className="mr-2 h-4 w-4" />
              Sign In
            </Button>
            <Button variant="outline" onClick={() => router.push('/')} size="lg">
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
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
        <div className="text-center space-y-4">
          <Users className="mx-auto h-16 w-16 text-muted-foreground" />
          <h1 className="text-2xl font-bold">No Household Found</h1>
          <p className="text-muted-foreground">
            You're not part of any household yet.
          </p>
          <Button onClick={() => router.push('/')}>
            <Home className="mr-2 h-4 w-4" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }



  return (
    <div className="flex-1 flex flex-col bg-background px-4 md:px-8 py-6 md:py-8 container mx-auto">
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
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Member
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
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
                          <p className="text-sm text-muted-foreground">
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
    </div>
  );
}
