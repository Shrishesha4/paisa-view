# Paisa View

A comprehensive budgeting and expense tracking app for personal finance management with cross-device synchronization and household collaboration.

## Features

- **Expense Tracking**: Categorize and track your daily expenses
- **Income Management**: Record and monitor your income sources
- **Budget Planning**: Set monthly budgets and track spending
- **Data Visualization**: Beautiful charts and summaries of your finances
- **Cross-Device Sync**: Sign up for an account to sync data across all your devices
- **Household Collaboration**: Create or join households for family budgeting
- **Local & Cloud Storage**: Keep data locally or sync to Firebase for backup
- **Multiple Authentication**: Sign in with Google or email/password
- **Progressive Web App**: Works offline and can be installed on mobile devices
- **Offline-First Design**: All data is stored locally and automatically syncs when online

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up Firebase (see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md))
4. Run the development server: `npm run dev`
5. Open [http://localhost:9002](http://localhost:9002) in your browser

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **State Management**: React hooks with local storage
- **Charts**: Recharts
- **AI Integration**: Google Genkit

## Offline-First & Sync

Paisa View is designed as an offline-first application:

- **Offline-First**: All data is stored locally on your device and works without internet
- **Automatic Sync**: When you're online, all changes automatically sync to the cloud
- **Background Sync**: Data syncs in the background even when the app is closed
- **Conflict Resolution**: Smart merging of local and cloud data prevents conflicts
- **Local Mode**: Use the app without signing up - data stays on your device
- **Cloud Mode**: Sign up for an account to sync data across devices and collaborate with family members
- **Authentication Options**: Choose between Google OAuth (recommended) or email/password registration

### Offline Capabilities

- ✅ Add expenses and income while offline
- ✅ Set and modify budgets
- ✅ View all your financial data
- ✅ Categorize transactions
- ✅ Export/import data
- ✅ All changes queue for sync when online

## Contributing

Feel free to submit issues and enhancement requests!
