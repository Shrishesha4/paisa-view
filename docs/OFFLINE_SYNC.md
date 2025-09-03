# Offline-First Sync System

Paisa View implements a robust offline-first synchronization system that ensures your data is always available, even without an internet connection.

## Overview

The app follows these core principles:
1. **Data First**: All data is stored locally on your device
2. **Offline Priority**: App works completely offline
3. **Automatic Sync**: Data syncs automatically when online
4. **Conflict Resolution**: Smart merging prevents data loss
5. **Background Processing**: Sync happens even when app is closed

## Architecture

### Components

1. **OfflineSyncManager** (`src/lib/offline-sync.ts`)
   - Core sync orchestration
   - Queue management
   - Network state monitoring
   - Retry logic with exponential backoff

2. **useOfflineSync Hook** (`src/hooks/use-offline-sync.ts`)
   - React integration
   - Real-time sync status
   - Manual sync triggers

3. **OfflineSyncIndicator** (`src/components/offline-sync-indicator.tsx`)
   - Visual sync status display
   - Network connectivity indicator
   - Pending changes counter

4. **Service Worker** (`public/sw.js`)
   - Offline caching
   - Background sync
   - Push notifications

## How It Works

### 1. Data Flow

```
User Action → Local Storage → Sync Queue → Firestore (when online)
     ↓              ↓            ↓              ↓
  Immediate    Instant Save   Queued for    Cloud Sync
  Feedback     to Device      Later Sync    Complete
```

### 2. Sync Queue Management

Every data change creates a sync queue item:

```typescript
interface SyncQueueItem {
  id: string;
  type: 'expense' | 'income' | 'budget' | 'category';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retryCount: number;
}
```

### 3. Network State Detection

The system automatically detects network changes:

- **Online**: Triggers immediate sync attempts
- **Offline**: Queues changes for later sync
- **Reconnection**: Automatically resumes sync

### 4. Sync Process

1. **Queue Processing**: Items processed in batches of 10
2. **Conflict Resolution**: Smart merging of local and cloud data
3. **Retry Logic**: Failed items retry up to 3 times
4. **Exponential Backoff**: Increasing delays between retries

## Usage Examples

### Adding Data to Sync Queue

```typescript
import { useOfflineSync } from '@/hooks/use-offline-sync';

function MyComponent() {
  const { addExpenseToSync, addIncomeToSync } = useOfflineSync();

  const handleAddExpense = (expense) => {
    // Save to local storage
    setExpenses(prev => [...prev, expense]);
    
    // Add to sync queue
    addExpenseToSync(expense, 'create');
  };
}
```

### Manual Sync Trigger

```typescript
const { triggerManualSync, isOnline } = useOfflineSync();

const handleSync = async () => {
  if (isOnline) {
    await triggerManualSync();
  }
};
```

### Sync Status Monitoring

```typescript
const { 
  syncState, 
  isOnline, 
  isSyncing, 
  hasPendingChanges,
  pendingChangesCount 
} = useOfflineSync();

// Check current status
if (hasPendingChanges) {
  console.log(`${pendingChangesCount} changes waiting to sync`);
}
```

## Sync States

| State | Description | Icon | Color |
|-------|-------------|------|-------|
| `not-authenticated` | User not signed in | 🔒 | Gray |
| `offline` | No internet connection | 📱 | Yellow |
| `syncing` | Currently syncing data | 🔄 | Blue |
| `pending` | Changes waiting to sync | ⏳ | Orange |
| `synced` | All data synchronized | ✅ | Green |
| `not-synced` | Never synced before | 📤 | Gray |

## Offline Capabilities

### What Works Offline

✅ **Full Functionality**
- Add/edit/delete expenses
- Add/edit/delete income
- Set/modify budgets
- View all financial data
- Categorize transactions
- Export data
- Import data

✅ **Data Persistence**
- All changes saved locally
- Data survives app restarts
- Works across browser sessions

### What Happens When Online

🔄 **Automatic Sync**
- Queued changes sync immediately
- Background sync every 30 seconds
- Real-time status updates
- Conflict resolution

## Conflict Resolution

### Smart Merging Strategy

1. **Timestamp-based**: Newer data takes precedence
2. **Field-level merging**: Individual fields merged intelligently
3. **No data loss**: All changes preserved
4. **User notification**: Conflicts reported transparently

### Example Conflict Resolution

```typescript
// Local data (modified 2 hours ago)
{ amount: 100, description: "Coffee", category: "Food" }

// Cloud data (modified 1 hour ago)
{ amount: 150, description: "Coffee", category: "Food" }

// Result: Cloud data wins (newer timestamp)
{ amount: 150, description: "Coffee", category: "Food" }
```

## Performance Optimizations

### Batch Processing
- Sync items processed in batches of 10
- Reduces API calls and improves performance
- Configurable batch size

### Caching Strategy
- Static assets cached for offline use
- Dynamic content cached intelligently
- Automatic cache cleanup

### Background Sync
- Sync continues when app is closed
- Uses browser's background sync API
- Minimal battery impact

## Error Handling

### Retry Logic
- Failed sync items retry up to 3 times
- Exponential backoff (5s, 10s, 20s)
- Maximum retry delay: 60 seconds

### Fallback Strategies
- Offline mode for API failures
- Local storage as primary data source
- Graceful degradation of features

### User Feedback
- Clear error messages
- Sync status indicators
- Manual retry options

## Configuration

### Sync Intervals
```typescript
// Automatic sync every 30 seconds when online
const SYNC_INTERVAL = 30000;

// Retry delay starts at 5 seconds
const INITIAL_RETRY_DELAY = 5000;

// Maximum retry attempts
const MAX_RETRIES = 3;
```

### Queue Limits
```typescript
// Maximum items in sync queue
const MAX_QUEUE_SIZE = 1000;

// Batch size for processing
const BATCH_SIZE = 10;
```

## Troubleshooting

### Common Issues

1. **Sync Not Working**
   - Check internet connection
   - Verify user authentication
   - Check browser console for errors

2. **Data Not Syncing**
   - Ensure app is online
   - Check sync queue status
   - Try manual sync trigger

3. **Offline Mode Issues**
   - Clear browser cache
   - Check service worker status
   - Verify PWA installation

### Debug Information

Enable debug logging:
```typescript
// In browser console
localStorage.setItem('paisa-debug', 'true');
```

Check sync queue:
```typescript
// View current sync queue
console.log(JSON.parse(localStorage.getItem('paisa-sync-queue')));
```

## Future Enhancements

### Planned Features
- **Real-time sync**: WebSocket-based live updates
- **Selective sync**: Choose what data to sync
- **Sync scheduling**: Custom sync intervals
- **Data compression**: Reduce sync payload size
- **Multi-device sync**: Cross-device conflict resolution

### Advanced Sync Options
- **Sync filters**: Sync only specific categories
- **Sync history**: Track all sync operations
- **Manual conflict resolution**: User choice in conflicts
- **Sync analytics**: Performance metrics and insights

## Best Practices

### For Users
1. **Stay signed in** for automatic sync
2. **Check sync status** before important operations
3. **Use manual sync** if automatic sync seems stuck
4. **Report issues** if sync problems persist

### For Developers
1. **Always add to sync queue** when modifying data
2. **Handle offline states** gracefully
3. **Provide clear feedback** about sync status
4. **Test offline scenarios** thoroughly

## Security Considerations

### Data Privacy
- All data encrypted in transit
- Local data stored securely
- User authentication required for sync
- No data shared without consent

### Sync Security
- Firebase security rules enforced
- User data isolation maintained
- Household data access controlled
- Audit logging for sync operations

---

This offline-first sync system ensures Paisa View provides a reliable, always-available financial tracking experience, regardless of network conditions.
