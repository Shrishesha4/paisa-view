import { FirestoreService, UserData } from './firestore';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Transaction, Expense, Income, Budget, Category } from './types';

export interface SyncQueueItem {
  id: string;
  type: 'expense' | 'income' | 'budget' | 'category';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retryCount: number;
}

export interface OfflineSyncState {
  isOnline: boolean;
  lastSyncAttempt: Date | null;
  syncQueue: SyncQueueItem[];
  isSyncing: boolean;
  lastSuccessfulSync: Date | null;
}

class OfflineSyncManager {
  private syncQueue: SyncQueueItem[] = [];
  private isOnline: boolean = navigator.onLine;
  private isSyncing: boolean = false;
  private lastSyncAttempt: Date | null = null;
  private lastSuccessfulSync: Date | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private retryDelay: number = 5000; // 5 seconds
  private maxRetries: number = 3;

  constructor() {
    this.initializeOfflineSync();
  }

  private initializeOfflineSync() {
    // Load existing sync queue from localStorage
    this.loadSyncQueue();
    
    // Set up online/offline event listeners
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Start periodic sync attempts
    this.startPeriodicSync();
    
    // Attempt initial sync if online
    if (this.isOnline) {
      this.attemptSync();
    }
  }

  private loadSyncQueue() {
    try {
      const savedQueue = localStorage.getItem('paisa-sync-queue');
      if (savedQueue) {
        this.syncQueue = JSON.parse(savedQueue);
      }
    } catch (error) {
      console.error('Error loading sync queue:', error);
      this.syncQueue = [];
    }
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
    console.log('Network connection restored. Attempting to sync...');
    this.attemptSync();
  }

  private handleOffline() {
    this.isOnline = false;
    console.log('Network connection lost. Queuing changes for later sync.');
  }

  private startPeriodicSync() {
    // Attempt sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline && this.syncQueue.length > 0) {
        this.attemptSync();
      }
    }, 30000);
  }

  // Generate unique ID that works across all browsers
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Add item to sync queue
  public addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>) {
    const syncItem: SyncQueueItem = {
      ...item,
      id: this.generateId(),
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.syncQueue.push(syncItem);
    this.saveSyncQueue();
    
    // Attempt immediate sync if online
    if (this.isOnline && !this.isSyncing) {
      this.attemptSync();
    }
  }

  // Main sync method
  private async attemptSync() {
    if (this.isSyncing || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    this.isSyncing = true;
    this.lastSyncAttempt = new Date();

    try {
      console.log(`Starting sync for ${this.syncQueue.length} items...`);
      
      // Process sync queue in batches
      const batchSize = 10;
      for (let i = 0; i < this.syncQueue.length; i += batchSize) {
        const batch = this.syncQueue.slice(i, i + batchSize);
        await this.processSyncBatch(batch);
      }

      // Clear successful sync queue
      this.syncQueue = this.syncQueue.filter(item => item.retryCount < this.maxRetries);
      this.saveSyncQueue();
      
      this.lastSuccessfulSync = new Date();
      console.log('Sync completed successfully');
      
    } catch (error) {
      console.error('Sync failed:', error);
      this.handleSyncError();
    } finally {
      this.isSyncing = false;
    }
  }

  private async processSyncBatch(batch: SyncQueueItem[]) {
    for (const item of batch) {
      try {
        await this.processSyncItem(item);
        // Remove successful item from queue
        this.syncQueue = this.syncQueue.filter(q => q.id !== item.id);
      } catch (error) {
        console.error(`Failed to sync item ${item.id}:`, error);
        item.retryCount++;
        
        if (item.retryCount >= this.maxRetries) {
          console.error(`Item ${item.id} exceeded max retries, removing from queue`);
          this.syncQueue = this.syncQueue.filter(q => q.id !== item.id);
        }
      }
    }
  }

  private async processSyncItem(item: SyncQueueItem) {
    // This would integrate with your existing FirestoreService
    // For now, we'll simulate the sync process
    switch (item.type) {
      case 'expense':
        if (item.action === 'create' || item.action === 'update') {
          // Update local data and sync to Firestore
          await this.syncExpenseData(item);
        }
        break;
      case 'income':
        if (item.action === 'create' || item.action === 'update') {
          await this.syncIncomeData(item);
        }
        break;
      case 'budget':
        if (item.action === 'create' || item.action === 'update') {
          await this.syncBudgetData(item);
        }
        break;
      case 'category':
        if (item.action === 'create' || item.action === 'update') {
          await this.syncCategoryData(item);
        }
        break;
    }
  }

  private async syncExpenseData(item: SyncQueueItem) {
    try {
      // Get current local data
      const localExpenses = JSON.parse(localStorage.getItem('expenses') || '[]');
      
      // Update local data based on sync item
      if (item.action === 'create') {
        localExpenses.push(item.data);
      } else if (item.action === 'update') {
        const index = localExpenses.findIndex((e: any) => e.id === item.data.id);
        if (index !== -1) {
          localExpenses[index] = item.data;
        }
      }
      
      // Save updated local data
      localStorage.setItem('expenses', JSON.stringify(localExpenses));
      
      // Sync to Firestore using FirestoreService
      const { FirestoreService } = await import('./firestore');
      const auth = await import('./firebase');
      
      // Get current user data from Firestore
      const currentUserId = auth.auth.currentUser?.uid;
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
      // Get current local data
      const localIncomes = JSON.parse(localStorage.getItem('incomes') || '[]');
      
      // Update local data based on sync item
      if (item.action === 'create') {
        localIncomes.push(item.data);
      } else if (item.action === 'update') {
        const index = localIncomes.findIndex((i: any) => i.id === item.data.id);
        if (index !== -1) {
          localIncomes[index] = item.data;
        }
      }
      
      // Save updated local data
      localStorage.setItem('incomes', JSON.stringify(localIncomes));
      
      // Sync to Firestore using FirestoreService
      const { FirestoreService } = await import('./firestore');
      const auth = await import('./firebase');
      
      // Get current user data from Firestore
      const currentUserId = auth.auth.currentUser?.uid;
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
      // Get current local data
      const localBudgets = JSON.parse(localStorage.getItem('budgets') || '[]');
      
      // Update local data based on sync item
      if (item.action === 'create') {
        localBudgets.push(item.data);
      } else if (item.action === 'update') {
        const index = localBudgets.findIndex((b: any) => b.id === item.data.id);
        if (index !== -1) {
          localBudgets[index] = item.data;
        }
      }
      
      // Save updated local data
      localStorage.setItem('budgets', JSON.stringify(localBudgets));
      
      // Sync to Firestore using FirestoreService
      const { FirestoreService } = await import('./firestore');
      const auth = await import('./firebase');
      
      // Get current user data from Firestore
      const currentUserId = auth.auth.currentUser?.uid;
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
    const localCategories = JSON.parse(localStorage.getItem('categories') || '[]');
    
    if (item.action === 'create') {
      localCategories.push(item.data);
    } else if (item.action === 'update') {
      const index = localCategories.findIndex((c: any) => c.id === item.data.id);
      if (index !== -1) {
        localCategories[index] = item.data;
      }
    }
    
    localStorage.setItem('categories', JSON.stringify(localCategories));
  }

  private handleSyncError() {
    // Implement exponential backoff for retry attempts
    this.retryDelay = Math.min(this.retryDelay * 2, 60000); // Max 1 minute
    
    // Schedule retry
    setTimeout(() => {
      if (this.isOnline && this.syncQueue.length > 0) {
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
    };
  }

  // Public method to manually trigger sync
  public async manualSync() {
    if (this.isOnline) {
      await this.attemptSync();
    }
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
