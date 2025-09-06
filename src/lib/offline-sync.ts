// Enhanced offline sync manager with comprehensive offline strategies
import { Expense, Income, Budget, Category } from './types';

export interface SyncQueueItem {
  id: string;
  type: 'expense' | 'income' | 'budget' | 'category';
  action: 'create' | 'update' | 'delete';
  data: Expense | Income | Budget | string; // Category is string
  timestamp: number;
  retryCount: number;
  priority: 'high' | 'medium' | 'low';
  conflictResolution?: 'local-wins' | 'remote-wins' | 'manual';
}

export interface OfflineSyncState {
  isOnline: boolean;
  lastSyncAttempt: Date | null;
  syncQueue: SyncQueueItem[];
  isSyncing: boolean;
  lastSuccessfulSync: Date | null;
  syncErrors: Array<{
    timestamp: Date;
    error: string;
    itemId: string;
    retryCount: number;
  }>;
  dataIntegrity: {
    lastValidation: Date | null;
    hasConflicts: boolean;
    conflictCount: number;
  };
}

export interface SyncConflict {
  localData: unknown;
  remoteData: unknown;
  itemId: string;
  type: string;
  timestamp: Date;
}

class OfflineSyncManager {
  private syncQueue: SyncQueueItem[] = [];
  private isOnline: boolean = navigator.onLine;
  private isSyncing: boolean = false;
  private lastSyncAttempt: Date | null = null;
  private lastSuccessfulSync: Date | null = null;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private retryDelay: number = 5000; // 5 seconds
  private maxRetries: number = 3;
  private syncErrors: Array<{
    timestamp: Date;
    error: string;
    itemId: string;
    retryCount: number;
  }> = [];
  private dataIntegrity = {
    lastValidation: null as Date | null,
    hasConflicts: false,
    conflictCount: 0,
  };

  constructor() {
    this.initializeOfflineSync();
  }

  // Type guard methods
  private isExpenseData(data: unknown): data is Expense {
    return (
      typeof data === 'object' &&
      data !== null &&
      'id' in data &&
      'amount' in data &&
      'date' in data &&
      'description' in data &&
      'category' in data
    );
  }

  private isIncomeData(data: unknown): data is Income {
    return (
      typeof data === 'object' &&
      data !== null &&
      'id' in data &&
      'amount' in data &&
      'date' in data &&
      'description' in data &&
      'category' in data
    );
  }

  private isBudgetData(data: unknown): data is Budget {
    return (
      typeof data === 'object' &&
      data !== null &&
      'id' in data &&
      'amount' in data
    );
  }

  private isCategoryData(data: unknown): data is string {
    return typeof data === 'string';
  }

  private initializeOfflineSync() {
    // Load existing sync queue from localStorage
    this.loadSyncQueue();
    
    // Set up enhanced network event listeners
    this.setupNetworkListeners();
    
    // Start periodic sync attempts
    this.startPeriodicSync();
    
    // Attempt initial sync if online
    if (this.isOnline) {
      this.attemptSync();
    }

    // Start data integrity checks
    this.startDataIntegrityChecks();
  }

  private loadSyncQueue() {
    try {
      const savedQueue = localStorage.getItem('paisa-sync-queue');
      if (savedQueue) {
        this.syncQueue = JSON.parse(savedQueue);
        // Validate queue items and remove invalid ones
        this.syncQueue = this.syncQueue.filter(item => this.validateQueueItem(item));
      }
    } catch (error) {
      console.error('Error loading sync queue:', error);
      this.syncQueue = [];
    }
  }

  private validateQueueItem(item: SyncQueueItem): boolean {
    return (
      Boolean(item.id) &&
      Boolean(item.type) &&
      Boolean(item.action) &&
      Boolean(item.data) &&
      typeof item.timestamp === 'number' &&
      typeof item.retryCount === 'number' &&
      item.retryCount <= this.maxRetries
    );
  }

  private saveSyncQueue() {
    try {
      localStorage.setItem('paisa-sync-queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }

  private handleOnline() {
    this.isOnline = true;
    console.log('🌐 Network connection restored. Attempting to sync...');
    
    // Clear any network-related errors
    this.syncErrors = this.syncErrors.filter(error => 
      !error.error.includes('network') && !error.error.includes('offline')
    );
    
    // Attempt sync with exponential backoff
    this.attemptSyncWithBackoff();
  }

  private handleOffline() {
    this.isOnline = false;
    console.log('📴 Network connection lost. Queuing changes for later sync.');
    
    // Pause any ongoing sync operations
    this.isSyncing = false;
    
    // Add network error to sync errors
    this.addSyncError('network-offline', 'Network connection lost', 'system');
  }

  private startPeriodicSync() {
    // Attempt sync every 10 seconds when online for faster sync
    this.syncInterval = setInterval(() => {
      if (this.isOnline && this.syncQueue.length > 0 && !this.isSyncing) {
        this.attemptSync();
      }
    }, 10000);
  }

  // Enhanced network detection with automatic sync
  private setupNetworkListeners() {
    const handleOnline = () => {
      console.log('🌐 Network connection restored');
      this.isOnline = true;
      this.clearNetworkErrors();
      
      // Immediately attempt sync when coming back online
      setTimeout(() => {
        this.attemptSync();
      }, 1000);
    };

    const handleOffline = () => {
      console.log('📱 Network connection lost');
      this.isOnline = false;
      this.addSyncError('network-offline', 'Network connection lost', 'system');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }

  private startDataIntegrityChecks() {
    // Check data integrity every 5 minutes
    setInterval(() => {
      this.validateDataIntegrity();
    }, 300000);
  }

  private async validateDataIntegrity() {
    try {
      const localData = this.getLocalDataSnapshot();
      const conflicts = this.detectDataConflicts(localData);
      
      this.dataIntegrity.hasConflicts = conflicts.length > 0;
      this.dataIntegrity.conflictCount = conflicts.length;
      this.dataIntegrity.lastValidation = new Date();
      
      if (conflicts.length > 0) {
        console.warn(`⚠️ Data integrity check found ${conflicts.length} conflicts`);
        this.handleDataConflicts(conflicts);
      } else {
        console.log('✅ Data integrity check passed');
      }
    } catch (error) {
      console.error('❌ Data integrity check failed:', error);
    }
  }

  private getLocalDataSnapshot() {
    return {
      expenses: JSON.parse(localStorage.getItem('expenses') || '[]'),
      incomes: JSON.parse(localStorage.getItem('incomes') || '[]'),
      budgets: JSON.parse(localStorage.getItem('budgets') || '[]'),
      categories: JSON.parse(localStorage.getItem('categories') || '[]'),
      timestamp: Date.now(),
    };
  }

  private detectDataConflicts(localData: ReturnType<typeof this.getLocalDataSnapshot>): SyncConflict[] {
    const conflicts: SyncConflict[] = [];
    
    // Check for duplicate IDs across different data types
    const allIds = new Set<string>();
    
    [...localData.expenses, ...localData.incomes, ...localData.budgets].forEach(item => {
      if (item && typeof item === 'object' && 'id' in item && typeof item.id === 'string') {
        if (allIds.has(item.id)) {
          conflicts.push({
            localData: item,
            remoteData: null,
            itemId: item.id,
            type: 'duplicate-id',
            timestamp: new Date(),
          });
        } else {
          allIds.add(item.id);
        }
      }
    });
    
    return conflicts;
  }

  private handleDataConflicts(conflicts: SyncConflict[]) {
    // Log conflicts for debugging
    conflicts.forEach(conflict => {
      console.warn(`Conflict detected: ${conflict.type} for item ${conflict.itemId}`);
    });
    
    // For now, we'll use local-wins strategy
    // In a production app, you might want to implement manual conflict resolution
    this.resolveConflictsAutomatically(conflicts);
  }

  private resolveConflictsAutomatically(conflicts: SyncConflict[]) {
    conflicts.forEach(conflict => {
      if (conflict.type === 'duplicate-id') {
        // Remove duplicate items, keeping the most recent one
        this.removeDuplicateItems(conflict.itemId);
      }
    });
  }

  private removeDuplicateItems(itemId: string) {
    // Remove from all data types
    ['expenses', 'incomes', 'budgets'].forEach(dataType => {
      const data = JSON.parse(localStorage.getItem(dataType) || '[]');
      const filteredData = data.filter((item: { id: string }) => item.id !== itemId);
      localStorage.setItem(dataType, JSON.stringify(filteredData));
    });
  }

  // Generate unique ID that works across all browsers
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Add item to sync queue with priority
  public addToSyncQueue(
    item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount' | 'priority'>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ) {
    const syncItem: SyncQueueItem = {
      ...item,
      id: this.generateId(),
      timestamp: Date.now(),
      retryCount: 0,
      priority,
    };

    // Add to queue based on priority
    if (priority === 'high') {
      this.syncQueue.unshift(syncItem);
    } else {
      this.syncQueue.push(syncItem);
    }

    this.saveSyncQueue();
    console.log(`📝 Added ${item.type} ${item.action} to sync queue with ${priority} priority`);

    // Attempt immediate sync for high priority items
    if (priority === 'high' && this.isOnline && !this.isSyncing) {
      this.attemptSync();
    }
  }

  private async attemptSyncWithBackoff() {
    if (this.isSyncing) return;
    
    try {
      await this.attemptSync();
      // Reset retry delay on successful sync
      this.retryDelay = 5000;
    } catch (error) {
      this.handleSyncError();
    }
  }

  private async attemptSync() {
    if (this.isSyncing || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    this.isSyncing = true;
    this.lastSyncAttempt = new Date();

    try {
      console.log(`🔄 Starting sync of ${this.syncQueue.length} items...`);
      
      // Process items by priority
      const highPriorityItems = this.syncQueue.filter(item => item.priority === 'high');
      const mediumPriorityItems = this.syncQueue.filter(item => item.priority === 'medium');
      const lowPriorityItems = this.syncQueue.filter(item => item.priority === 'low');
      
      // Process in priority order
      await this.processSyncItems([...highPriorityItems, ...mediumPriorityItems, ...lowPriorityItems]);
      
      this.lastSuccessfulSync = new Date();
      console.log('✅ Sync completed successfully');
      
    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.addSyncError('sync-failed', String(error), 'system');
    } finally {
      this.isSyncing = false;
    }
  }

  private async processSyncItems(items: SyncQueueItem[]) {
    for (const item of items) {
      try {
        await this.processSyncItem(item);
        
        // Remove successfully processed item from queue
        this.syncQueue = this.syncQueue.filter(qItem => qItem.id !== item.id);
        this.saveSyncQueue();
        
      } catch (error) {
        console.error(`❌ Failed to process sync item ${item.id}:`, error);
        
        // Increment retry count
        item.retryCount++;
        
        if (item.retryCount >= this.maxRetries) {
          console.error(`❌ Item ${item.id} exceeded max retries, removing from queue`);
          this.syncQueue = this.syncQueue.filter(qItem => qItem.id !== item.id);
          this.addSyncError('max-retries-exceeded', String(error), item.id);
        } else {
          // Move to end of queue for retry
          this.syncQueue = this.syncQueue.filter(qItem => qItem.id !== item.id);
          this.syncQueue.push(item);
        }
        
        this.saveSyncQueue();
      }
    }
  }

  private async processSyncItem(item: SyncQueueItem) {
    console.log(`🔄 Processing ${item.type} ${item.action}:`, item.id);
    
    switch (item.type) {
      case 'expense':
        await this.syncExpenseData(item);
        break;
      case 'income':
        await this.syncIncomeData(item);
        break;
      case 'budget':
        await this.syncBudgetData(item);
        break;
      case 'category':
        await this.syncCategoryData(item);
        break;
      default:
        throw new Error(`Unknown sync item type: ${item.type}`);
    }
  }

  private async syncExpenseData(item: SyncQueueItem) {
    try {
      // Type guard to ensure data is an Expense
      if (item.type !== 'expense' || !this.isExpenseData(item.data)) {
        throw new Error('Invalid expense data for expense sync');
      }
      
      // Get current local data
      const localExpenses = JSON.parse(localStorage.getItem('expenses') || '[]');
      
      // Update local data based on sync item
      if (item.action === 'create') {
        // Check if expense already exists to prevent duplicates
        const existingIndex = localExpenses.findIndex((e: Expense) => e.id === (item.data as Expense).id);
        if (existingIndex === -1) {
          localExpenses.push(item.data);
        }
      } else if (item.action === 'update') {
        const index = localExpenses.findIndex((e: Expense) => e.id === (item.data as Expense).id);
        if (index !== -1) {
          localExpenses[index] = item.data as Expense;
        }
      } else if (item.action === 'delete') {
        const index = localExpenses.findIndex((e: Expense) => e.id === (item.data as Expense).id);
        if (index !== -1) {
          localExpenses.splice(index, 1);
        }
      }
      
      // Save updated local data
      localStorage.setItem('expenses', JSON.stringify(localExpenses));
      
      // Sync to Firestore using dynamic import
      const { FirestoreService } = await import('./firestore');
      const { auth } = await import('./firebase');
      
      // Get current user data from Firestore
      const currentUserId = auth.currentUser?.uid;
      if (!currentUserId) {
        console.error('❌ No authenticated user found for sync');
        return;
      }
      
      const currentUserData = await FirestoreService.getUserData(currentUserId);
      if (currentUserData) {
        const updatedUserData = {
          ...currentUserData,
          expenses: localExpenses,
          lastSync: new Date()
        };
        
        console.log('🔄 Syncing expense data to Firestore:', updatedUserData);
        await FirestoreService.syncUserData(currentUserId, updatedUserData);
        console.log('✅ Expense data synced to Firestore successfully');
      }
    } catch (error) {
      console.error('❌ Error syncing expense data:', error);
      throw error;
    }
  }

  private async syncIncomeData(item: SyncQueueItem) {
    try {
      // Type guard to ensure data is an Income
      if (item.type !== 'income' || !this.isIncomeData(item.data)) {
        throw new Error('Invalid income data for income sync');
      }
      
      // Get current local data
      const localIncomes = JSON.parse(localStorage.getItem('incomes') || '[]');
      
      // Update local data based on sync item
      if (item.action === 'create') {
        // Check if income already exists to prevent duplicates
        const existingIndex = localIncomes.findIndex((i: Income) => i.id === (item.data as Income).id);
        if (existingIndex === -1) {
          localIncomes.push(item.data);
        }
      } else if (item.action === 'update') {
        const index = localIncomes.findIndex((i: Income) => i.id === (item.data as Income).id);
        if (index !== -1) {
          localIncomes[index] = item.data as Income;
        }
      } else if (item.action === 'delete') {
        const index = localIncomes.findIndex((i: Income) => i.id === (item.data as Income).id);
        if (index !== -1) {
          localIncomes.splice(index, 1);
        }
      }
      
      // Save updated local data
      localStorage.setItem('incomes', JSON.stringify(localIncomes));
      
      // Sync to Firestore using dynamic import
      const { FirestoreService } = await import('./firestore');
      const { auth } = await import('./firebase');
      
      // Get current user data from Firestore
      const currentUserId = auth.currentUser?.uid;
      if (!currentUserId) {
        console.error('❌ No authenticated user found for sync');
        return;
      }
      
      const currentUserData = await FirestoreService.getUserData(currentUserId);
      if (currentUserData) {
        const updatedUserData = {
          ...currentUserData,
          incomes: localIncomes,
          lastSync: new Date()
        };
        
        console.log('🔄 Syncing income data to Firestore:', updatedUserData);
        await FirestoreService.syncUserData(currentUserId, updatedUserData);
        console.log('✅ Income data synced to Firestore successfully');
      }
    } catch (error) {
      console.error('❌ Error syncing income data:', error);
      throw error;
    }
  }

  private async syncBudgetData(item: SyncQueueItem) {
    try {
      // Type guard to ensure data is a Budget
      if (item.type !== 'budget' || !this.isBudgetData(item.data)) {
        throw new Error('Invalid budget data for budget sync');
      }
      
      // Get current local data
      const localBudgets = JSON.parse(localStorage.getItem('budgets') || '[]');
      
      // Update local data based on sync item
      if (item.action === 'create') {
        // Check if budget already exists to prevent duplicates
        const existingIndex = localBudgets.findIndex((b: Budget) => b.id === (item.data as Budget).id);
        if (existingIndex === -1) {
          localBudgets.push(item.data);
        }
      } else if (item.action === 'update') {
        const index = localBudgets.findIndex((b: Budget) => b.id === (item.data as Budget).id);
        if (index !== -1) {
          localBudgets[index] = item.data as Budget;
        }
      } else if (item.action === 'delete') {
        const index = localBudgets.findIndex((b: Budget) => b.id === (item.data as Budget).id);
        if (index !== -1) {
          localBudgets.splice(index, 1);
        }
      }
      
      // Save updated local data
      localStorage.setItem('budgets', JSON.stringify(localBudgets));
      
      // Sync to Firestore using dynamic import
      const { FirestoreService } = await import('./firestore');
      const { auth } = await import('./firebase');
      
      // Get current user data from Firestore
      const currentUserId = auth.currentUser?.uid;
      if (!currentUserId) {
        console.error('❌ No authenticated user found for sync');
        return;
      }
      
      const currentUserData = await FirestoreService.getUserData(currentUserId);
      if (currentUserData) {
        const updatedUserData = {
          ...currentUserData,
          budgets: localBudgets,
          lastSync: new Date()
        };
        
        console.log('🔄 Syncing budget data to Firestore:', updatedUserData);
        await FirestoreService.syncUserData(currentUserId, updatedUserData);
        console.log('✅ Budget data synced to Firestore successfully');
      }
    } catch (error) {
      console.error('❌ Error syncing budget data:', error);
      throw error;
    }
  }

  private async syncCategoryData(item: SyncQueueItem) {
    try {
      // Type guard to ensure data is a string (Category)
      if (item.type !== 'category' || !this.isCategoryData(item.data)) {
        throw new Error('Invalid category data for category sync');
      }
      
      const localCategories = JSON.parse(localStorage.getItem('categories') || '[]');
      
      if (item.action === 'create') {
        localCategories.push(item.data);
      } else if (item.action === 'update') {
        const index = localCategories.findIndex((c: string) => c === item.data);
        if (index !== -1) {
          localCategories[index] = item.data;
        }
      } else if (item.action === 'delete') {
        const index = localCategories.findIndex((c: string) => c === item.data);
        if (index !== -1) {
          localCategories.splice(index, 1);
        }
      }
      
      localStorage.setItem('categories', JSON.stringify(localCategories));
    } catch (error) {
      console.error('❌ Error syncing category data:', error);
      throw error;
    }
  }

  private addSyncError(errorType: string, errorMessage: string, itemId: string) {
    this.syncErrors.push({
      timestamp: new Date(),
      error: `${errorType}: ${errorMessage}`,
      itemId,
      retryCount: 0,
    });
    
    // Keep only last 50 errors
    if (this.syncErrors.length > 50) {
      this.syncErrors = this.syncErrors.slice(-50);
    }
  }

  private clearNetworkErrors() {
    this.syncErrors = this.syncErrors.filter(error => 
      !error.error.includes('network-offline')
    );
  }

  private handleSyncError() {
    // Implement exponential backoff for retry attempts
    this.retryDelay = Math.min(this.retryDelay * 2, 60000); // Max 1 minute
    
    console.log(`⏳ Scheduling retry in ${this.retryDelay}ms...`);
    
    // Schedule retry
    setTimeout(() => {
      if (this.isOnline && this.syncQueue.length > 0 && !this.isSyncing) {
        this.attemptSync();
      }
    }, this.retryDelay);
  }

  // Public method to get sync state
  public getSyncState(): OfflineSyncState {
    return {
      isOnline: this.isOnline,
      lastSyncAttempt: this.lastSyncAttempt,
      syncQueue: [...this.syncQueue],
      isSyncing: this.isSyncing,
      lastSuccessfulSync: this.lastSuccessfulSync,
      syncErrors: [...this.syncErrors],
      dataIntegrity: { ...this.dataIntegrity },
    };
  }

  // Public method to manually trigger sync
  public async manualSync() {
    if (this.isOnline && !this.isSyncing) {
      await this.attemptSync();
    }
  }

  // Public method to clear sync errors
  public clearSyncErrors() {
    this.syncErrors = [];
  }

  // Public method to get sync statistics
  public getSyncStats() {
    return {
      queueLength: this.syncQueue.length,
      errorCount: this.syncErrors.length,
      lastSync: this.lastSuccessfulSync,
      isOnline: this.isOnline,
      dataIntegrity: this.dataIntegrity,
    };
  }

  // Cleanup method
  public destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    window.removeEventListener('online', () => this.handleOnline());
    window.removeEventListener('offline', () => this.handleOffline());
  }
}

// Singleton instance
let syncManager: OfflineSyncManager | null = null;

export function getOfflineSyncManager(): OfflineSyncManager {
  if (!syncManager) {
    syncManager = new OfflineSyncManager();
  }
  return syncManager;
}

export function destroyOfflineSyncManager() {
  if (syncManager) {
    syncManager.destroy();
    syncManager = null;
  }
}
