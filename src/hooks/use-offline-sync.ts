"use client";

import { useState, useEffect, useCallback } from 'react';
import { getOfflineSyncManager, OfflineSyncState, SyncQueueItem } from '@/lib/offline-sync';
import { useAuth } from '@/lib/auth-context';
import { Expense, Income, Budget, Category } from '@/lib/types';

export function useOfflineSync() {
  const [syncState, setSyncState] = useState<OfflineSyncState>({
    isOnline: navigator.onLine,
    lastSyncAttempt: null,
    syncQueue: [],
    isSyncing: false,
    lastSuccessfulSync: null,
    syncErrors: [],
    dataIntegrity: {
      lastValidation: null,
      hasConflicts: false,
      conflictCount: 0,
    },
  });

  const { user } = useAuth();
  const syncManager = getOfflineSyncManager();

  // Update sync state periodically
  useEffect(() => {
    const updateSyncState = () => {
      setSyncState(syncManager.getSyncState());
    };

    // Update immediately
    updateSyncState();

    // Update every second to show real-time status
    const interval = setInterval(updateSyncState, 1000);

    return () => clearInterval(interval);
  }, [syncManager]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setSyncState(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setSyncState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Add expense to sync queue
  const addExpenseToSync = useCallback((expense: Expense, action: 'create' | 'update' | 'delete') => {
    if (user) {
      syncManager.addToSyncQueue({
        type: 'expense',
        action,
        data: expense,
      });
    }
  }, [user, syncManager]);

  // Add income to sync queue
  const addIncomeToSync = useCallback((income: Income, action: 'create' | 'update' | 'delete') => {
    if (user) {
      syncManager.addToSyncQueue({
        type: 'income',
        action,
        data: income,
      });
    }
  }, [user, syncManager]);

  // Add budget to sync queue
  const addBudgetToSync = useCallback((budget: Budget, action: 'create' | 'update' | 'delete') => {
    if (user) {
      syncManager.addToSyncQueue({
        type: 'budget',
        action,
        data: budget,
      });
    }
  }, [user, syncManager]);

  // Add category to sync queue
  const addCategoryToSync = useCallback((category: Category, action: 'create' | 'update' | 'delete') => {
    if (user) {
      syncManager.addToSyncQueue({
        type: 'category',
        action,
        data: category,
      });
    }
  }, [user, syncManager]);

  // Manual sync trigger
  const triggerManualSync = useCallback(async () => {
    if (user && syncState.isOnline) {
      await syncManager.manualSync();
    }
  }, [user, syncState.isOnline, syncManager]);

  // Get sync status summary
  const getSyncStatus = useCallback(() => {
    if (!user) return 'not-authenticated';
    if (!syncState.isOnline) return 'offline';
    if (syncState.isSyncing) return 'syncing';
    if (syncState.syncQueue.length > 0) return 'pending';
    if (syncState.lastSuccessfulSync) return 'synced';
    return 'not-synced';
  }, [user, syncState]);

  // Get sync status text
  const getSyncStatusText = useCallback(() => {
    const status = getSyncStatus();
    switch (status) {
      case 'not-authenticated':
        return 'Not signed in';
      case 'offline':
        return 'Offline - changes will sync when online';
      case 'syncing':
        return 'Syncing...';
      case 'pending':
        return `${syncState.syncQueue.length} changes pending sync`;
      case 'synced':
        return 'All changes synced';
      case 'not-synced':
        return 'Not synced yet';
      default:
        return 'Unknown status';
    }
  }, [getSyncStatus, syncState.syncQueue.length]);

  // Get sync status icon
  const getSyncStatusIcon = useCallback(() => {
    const status = getSyncStatus();
    switch (status) {
      case 'not-authenticated':
        return '🔒';
      case 'offline':
        return '📱';
      case 'syncing':
        return '🔄';
      case 'pending':
        return '⏳';
      case 'synced':
        return '✅';
      case 'not-synced':
        return '📤';
      default:
        return '❓';
    }
  }, [getSyncStatus]);

  return {
    // State
    syncState,
    
    // Actions
    addExpenseToSync,
    addIncomeToSync,
    addBudgetToSync,
    addCategoryToSync,
    triggerManualSync,
    
    // Status helpers
    getSyncStatus,
    getSyncStatusText,
    getSyncStatusIcon,
    
    // Computed values
    isOnline: syncState.isOnline,
    isSyncing: syncState.isSyncing,
    hasPendingChanges: syncState.syncQueue.length > 0,
    pendingChangesCount: syncState.syncQueue.length,
    lastSync: syncState.lastSuccessfulSync,
  };
}
