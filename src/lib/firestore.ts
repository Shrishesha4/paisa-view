import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Transaction, Expense, Income, Budget, Category } from './types';

export interface UserData {
  id?: string; // User ID from Firestore document
  expenses: Expense[];
  incomes: Income[];
  budgets: Budget[];
  categories: Category[];
  lastSync: Date;
  householdId?: string;
  isAdmin?: boolean;
  email?: string;
  displayName?: string;
  householdRemoved?: boolean;
  householdRemovedBy?: string;
  householdRemovedAt?: any; // Firestore Timestamp
}

export interface JoinRequest {
  id: string;
  householdId: string;
  userId: string;
  userEmail: string;
  userDisplayName?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
  adminNotes?: string;
}

export interface Household {
  id: string;
  name: string;
  adminId: string;
  members: string[];
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export class FirestoreService {
  // User data operations
  static async syncUserData(userId: string, data: UserData): Promise<void> {
    try {
      // Clean the data to remove any undefined values before sending to Firestore
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined)
      );
      
      console.log('🧹 Cleaning data before Firestore sync:', cleanData);
      console.log('🔍 Removed undefined fields:', Object.entries(data).filter(([k, v]) => v === undefined).map(([k]) => k));
      
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        ...cleanData,
        lastSync: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error syncing user data:', error);
      throw error;
    }
  }

  static async getUserData(userId: string): Promise<UserData | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        return {
          ...data,
          lastSync: data.lastSync?.toDate() || new Date(),
        } as UserData;
      }
      return null;
    } catch (error) {
      console.error('Error getting user data:', error);
      throw error;
    }
  }

  // Household operations
  static async createHousehold(name: string, adminId: string, userEmail?: string, userDisplayName?: string): Promise<string> {
    try {
      console.log('Creating household with:', { name, adminId, userEmail, userDisplayName });
      
      const householdRef = doc(collection(db, 'households'));
      const household = {
        name,
        adminId,
        members: [adminId],
      };
      
      console.log('Household data to send:', household);
      console.log('Household ref:', householdRef.path);
      
      await setDoc(householdRef, household);
      console.log('Household created successfully');
      
      // Create or update user's householdId
      const userRef = doc(db, 'users', adminId);
      const userData = {
        householdId: householdRef.id,
        isAdmin: true,
        email: userEmail,
        displayName: userDisplayName,
        expenses: [],
        incomes: [],
        budgets: [],
        categories: [],
        lastSync: serverTimestamp(),
      };
      
      console.log('User data to send:', userData);
      console.log('User ref:', userRef.path);
      
      await setDoc(userRef, userData, { merge: true });
      console.log('User updated successfully');
      
      return householdRef.id;
    } catch (error: any) {
      console.error('Error creating household:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details
      });
      throw error;
    }
  }

  static async joinHousehold(householdId: string, userId: string, userEmail?: string, userDisplayName?: string): Promise<void> {
    try {
      console.log('Joining household:', { householdId, userId, userEmail, userDisplayName });
      
      // Validate inputs
      if (!householdId || !userId) {
        throw new Error('Invalid household ID or user ID');
      }
      
      if (userId.length < 10) {
        console.warn('User ID seems unusually short:', userId);
      }
      
      const householdRef = doc(db, 'households', householdId);
      const householdSnap = await getDoc(householdRef);
      
      if (!householdSnap.exists()) {
        throw new Error('Household not found');
      }
      
      const household = householdSnap.data() as Household;
      console.log('Household data:', household);
      
      if (!household.members.includes(userId)) {
        console.log('Adding user to household members');
        await updateDoc(householdRef, {
          members: [...household.members, userId],
        });
      } else {
        console.log('User already in household members');
      }
      
      // Create or update user's householdId
      const userRef = doc(db, 'users', userId);
      const userData = {
        householdId,
        isAdmin: false,
        email: userEmail,
        displayName: userDisplayName,
        expenses: [],
        incomes: [],
        budgets: [],
        categories: [],
        lastSync: serverTimestamp(),
      };
      
      console.log('Creating/updating user document:', userData);
      console.log('User ref path:', userRef.path);
      
      await setDoc(userRef, userData, { merge: true });
      console.log('User document updated successfully');
      
    } catch (error: any) {
      console.error('Error joining household:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details
      });
      throw error;
    }
  }

  static async getHouseholdData(householdId: string): Promise<UserData[]> {
    try {
      // First get the household to see the current members list
      const household = await this.getHousehold(householdId);
      if (!household) {
        console.log('Household not found for getHouseholdData:', householdId);
        return [];
      }
      
      console.log('Getting household data for members:', household.members);
      
      // Query users by householdId to get current household members
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('householdId', '==', householdId));
      const querySnapshot = await getDocs(q);
      
      const householdData: UserData[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        householdData.push({
          ...data,
          id: doc.id, // Include the user ID
          lastSync: data.lastSync?.toDate() || new Date(),
        } as UserData);
      });
      
      console.log('Found household members:', householdData.map(u => ({ id: u.id, email: u.email, householdId: u.householdId })));
      
      return householdData;
    } catch (error) {
      console.error('Error getting household data:', error);
      throw error;
    }
  }

  static async findHouseholdByName(name: string): Promise<string | null> {
    try {
      const householdsRef = collection(db, 'households');
      const q = query(householdsRef, where('name', '==', name));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      // Return the first household found with this name
      const householdDoc = querySnapshot.docs[0];
      return householdDoc.id;
    } catch (error) {
      console.error('Error finding household by name:', error);
      throw error;
    }
  }

  static async findUserIdByEmail(email: string): Promise<string | null> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      // Return the first user found with this email
      const userDoc = querySnapshot.docs[0];
      return userDoc.id;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  // Join request methods
  static async sendJoinRequest(householdId: string, userId: string, userEmail: string, userDisplayName?: string): Promise<void> {
    try {
      console.log('Sending join request:', { householdId, userId, userEmail, userDisplayName });
      
      // Check if user already has a pending request
      const existingRequest = await this.getPendingJoinRequest(householdId, userId);
      if (existingRequest) {
        throw new Error('You already have a pending join request for this household');
      }
      
      // Check if user is already a member
      const userData = await this.getUserData(userId);
      if (userData?.householdId === householdId) {
        throw new Error('You are already a member of this household');
      }
      
      const requestsRef = collection(db, 'joinRequests');
      const newRequest: Omit<JoinRequest, 'id'> = {
        householdId,
        userId,
        userEmail,
        userDisplayName,
        status: 'pending',
        createdAt: serverTimestamp(),
      };
      
      await addDoc(requestsRef, newRequest);
      console.log('Join request sent successfully');
    } catch (error) {
      console.error('Error sending join request:', error);
      throw error;
    }
  }

  static async getPendingJoinRequest(householdId: string, userId: string): Promise<JoinRequest | null> {
    try {
      const requestsRef = collection(db, 'joinRequests');
      const q = query(
        requestsRef, 
        where('householdId', '==', householdId),
        where('userId', '==', userId),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as JoinRequest;
    } catch (error) {
      console.error('Error getting pending join request:', error);
      return null;
    }
  }

  static async getHouseholdJoinRequests(householdId: string): Promise<JoinRequest[]> {
    try {
      const requestsRef = collection(db, 'joinRequests');
      const q = query(
        requestsRef, 
        where('householdId', '==', householdId),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(q);
      
      const requests: JoinRequest[] = [];
      querySnapshot.forEach((doc) => {
        requests.push({
          id: doc.id,
          ...doc.data()
        } as JoinRequest);
      });
      
      return requests;
    } catch (error) {
      console.error('Error getting household join requests:', error);
      return [];
    }
  }

  static async approveJoinRequest(requestId: string): Promise<void> {
    try {
      const requestRef = doc(db, 'joinRequests', requestId);
      const requestSnap = await getDoc(requestRef);
      
      if (!requestSnap.exists()) {
        throw new Error('Join request not found');
      }
      
      const request = requestSnap.data() as JoinRequest;
      
      // Update request status
      await updateDoc(requestRef, {
        status: 'approved',
        updatedAt: serverTimestamp(),
      });
      
      // Add user to household
      await this.joinHousehold(request.householdId, request.userId, request.userEmail, request.userDisplayName);
      
      console.log('Join request approved and user added to household');
    } catch (error) {
      console.error('Error approving join request:', error);
      throw error;
    }
  }

  static async rejectJoinRequest(requestId: string, adminNotes?: string): Promise<void> {
    try {
      const requestRef = doc(db, 'joinRequests', requestId);
      
      await updateDoc(requestRef, {
        status: 'rejected',
        updatedAt: serverTimestamp(),
        adminNotes,
      });
      
      console.log('Join request rejected');
    } catch (error) {
      console.error('Error rejecting join request:', error);
      throw error;
    }
  }

  static async ensureUserDocument(userId: string, userData: Partial<UserData>): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        // Create user document if it doesn't exist
        const defaultUserData: UserData = {
          expenses: [],
          incomes: [],
          budgets: [],
          categories: [],
          lastSync: new Date(),
          ...userData
        };
        
        await setDoc(userRef, defaultUserData);
        console.log('Created missing user document for:', userId);
      } else {
        // Update existing user document with new data
        await updateDoc(userRef, userData);
        console.log('Updated existing user document for:', userId);
      }
    } catch (error) {
      console.error('Error ensuring user document exists:', error);
      throw error;
    }
  }

  static async getHousehold(householdId: string): Promise<Household | null> {
    try {
      const householdRef = doc(db, 'households', householdId);
      const householdSnap = await getDoc(householdRef);
      
      if (!householdSnap.exists()) {
        return null;
      }
      
      const data = householdSnap.data();
      
      // Handle Firestore timestamps properly
      let createdAt: Date;
      let updatedAt: Date;
      
      try {
        createdAt = data.createdAt?.toDate?.() || new Date();
      } catch {
        createdAt = new Date();
      }
      
      try {
        updatedAt = data.updatedAt?.toDate?.() || new Date();
      } catch {
        updatedAt = new Date();
      }
      
      return {
        id: householdSnap.id,
        name: data.name,
        adminId: data.adminId,
        members: data.members,
        createdAt,
        updatedAt,
      };
    } catch (error) {
      console.error('Error getting household:', error);
      throw error;
    }
  }

  static async isUserInHousehold(userId: string): Promise<boolean> {
    try {
      const userData = await this.getUserData(userId);
      return !!(userData?.householdId);
    } catch (error) {
      console.error('Error checking if user is in household:', error);
      return false;
    }
  }

  static async updateUserEmail(userId: string, email: string, displayName?: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const updateData: any = { email: email };
      if (displayName) {
        updateData.displayName = displayName;
      }
      
      await updateDoc(userRef, updateData);
      console.log('Updated user data:', userId, { email, displayName });
    } catch (error) {
      console.error('Error updating user data:', error);
      throw error;
    }
  }

  // Household management methods
  static async updateHouseholdName(householdId: string, newName: string): Promise<void> {
    try {
      const householdRef = doc(db, 'households', householdId);
      await updateDoc(householdRef, {
        name: newName,
        updatedAt: serverTimestamp(),
      });
      console.log('Updated household name:', householdId, newName);
    } catch (error) {
      console.error('Error updating household name:', error);
      throw error;
    }
  }

  static async transferAdmin(householdId: string, newAdminId: string): Promise<void> {
    try {
      const householdRef = doc(db, 'households', householdId);
      
      // Get the current household data BEFORE updating
      const currentHousehold = await this.getHousehold(householdId);
      if (!currentHousehold) {
        throw new Error('Household not found');
      }
      
      const oldAdminId = currentHousehold.adminId;
      
      console.log('Current household data:', {
        householdId,
        currentHousehold,
        oldAdminId,
        members: currentHousehold.members
      });
      
      console.log('Transferring admin role:', { householdId, oldAdminId, newAdminId });
      
      // Verify both users exist before proceeding
      const oldAdminRef = doc(db, 'users', oldAdminId);
      const newAdminRef = doc(db, 'users', newAdminId);
      
      console.log('Checking user documents:', {
        oldAdminPath: oldAdminRef.path,
        newAdminPath: newAdminRef.path
      });
      
      const oldAdminSnap = await getDoc(oldAdminRef);
      const newAdminSnap = await getDoc(newAdminRef);
      
      console.log('User document existence:', {
        oldAdminExists: oldAdminSnap.exists(),
        newAdminExists: newAdminSnap.exists(),
        oldAdminData: oldAdminSnap.exists() ? oldAdminSnap.data() : null,
        newAdminData: newAdminSnap.exists() ? newAdminSnap.data() : null
      });
      
      // Update household admin first
      await updateDoc(householdRef, {
        adminId: newAdminId,
        updatedAt: serverTimestamp(),
      });
      
      // Update old admin's role to false - ensure document exists first
      await setDoc(oldAdminRef, { isAdmin: false }, { merge: true });
      
      // Update new admin's role to true - ensure document exists first
      await setDoc(newAdminRef, { isAdmin: true }, { merge: true });
      
      console.log('Successfully updated admin roles: old admin -> false, new admin -> true');
      
      console.log('Successfully transferred admin role:', householdId, 'from', oldAdminId, 'to', newAdminId);
    } catch (error) {
      console.error('Error transferring admin role:', error);
      throw error;
    }
  }

  static async removeMember(householdId: string, memberId: string): Promise<void> {
    try {
      console.log('Removing member:', { householdId, memberId });
      
      const householdRef = doc(db, 'households', householdId);
      const household = await this.getHousehold(householdId);
      
      if (!household) {
        throw new Error('Household not found');
      }
      
      console.log('Current household members:', household.members);
      
      // Remove member from household
      const updatedMembers = household.members.filter(id => id !== memberId);
      console.log('Updated members list:', updatedMembers);
      
      await updateDoc(householdRef, {
        members: updatedMembers,
        updatedAt: serverTimestamp(),
      });
      
      console.log('Updated household members array');
      
      // Update member's household data - use setDoc with merge to handle missing documents
      const memberRef = doc(db, 'users', memberId);
      await setDoc(memberRef, {
        householdId: null,
        isAdmin: false,
      }, { merge: true });
      
      console.log('Updated member document');
      console.log('Successfully removed member:', householdId, memberId);
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  }

  static async deleteHousehold(householdId: string): Promise<void> {
    try {
      const household = await this.getHousehold(householdId);
      if (!household) {
        throw new Error('Household not found');
      }
      
      // Remove all members from household
      for (const memberId of household.members) {
        const memberRef = doc(db, 'users', memberId);
        await setDoc(memberRef, {
          householdId: null,
          isAdmin: false,
        }, { merge: true });
      }
      
      // Delete household document
      const householdRef = doc(db, 'households', householdId);
      await deleteDoc(householdRef);
      
      console.log('Deleted household:', householdId);
    } catch (error) {
      console.error('Error deleting household:', error);
      throw error;
    }
  }

  static async clearHouseholdNotification(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        householdRemoved: false,
        householdRemovedBy: null,
        householdRemovedAt: null,
      }, { merge: true });
      console.log('Cleared household notification for user:', userId);
    } catch (error) {
      console.error('Error clearing household notification:', error);
      throw error;
    }
  }

  static async leaveHousehold(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const householdId = userData.householdId;
        const isAdmin = userData.isAdmin;
        
        if (householdId) {
          // Remove user from household
          const householdRef = doc(db, 'households', householdId);
          const householdSnap = await getDoc(householdRef);
          
          if (householdSnap.exists()) {
            const household = householdSnap.data() as Household;
            const updatedMembers = household.members.filter(id => id !== userId);
            
            if (isAdmin) {
              // If admin is leaving, kick out all members and delete household
              console.log('Admin leaving household, kicking out all members:', householdId);
              
              // Remove all other members from household
              for (const memberId of updatedMembers) {
                const memberRef = doc(db, 'users', memberId);
                await setDoc(memberRef, {
                  householdId: null,
                  isAdmin: false,
                  // Add a flag to show notification on next login
                  householdRemoved: true,
                  householdRemovedBy: userId,
                  householdRemovedAt: serverTimestamp(),
                }, { merge: true });
              }
              
              // Delete the household
              await deleteDoc(householdRef);
              console.log('Household deleted due to admin leaving:', householdId);
            } else {
              // Regular member leaving
              if (updatedMembers.length === 0) {
                // Delete household if no members left
                await deleteDoc(householdRef);
              } else {
                // Update household members
                await updateDoc(householdRef, {
                  members: updatedMembers,
                  updatedAt: serverTimestamp(),
                });
              }
            }
          }
        }
        
        // Update user data - completely reset household-related fields
        await setDoc(userRef, {
          householdId: null,
          isAdmin: false,
          // Keep their personal financial data but remove household association
        }, { merge: true });
        
        console.log('User successfully left household:', userId);
      }
    } catch (error) {
      console.error('Error leaving household:', error);
      throw error;
    }
  }

  // Data migration helpers
  static async migrateLocalData(userId: string, localData: UserData): Promise<void> {
    try {
      // Check if user already has data in Firestore
      const existingData = await this.getUserData(userId);
      
      if (existingData) {
        // Merge local data with existing data, prioritizing newer data
        const mergedData = this.mergeData(existingData, localData);
        await this.syncUserData(userId, mergedData);
      } else {
        // First time sync
        await this.syncUserData(userId, localData);
      }
    } catch (error) {
      console.error('Error migrating local data:', error);
      throw error;
    }
  }

  private static mergeData(existing: UserData, local: UserData): UserData {
    // Simple merge strategy - you can enhance this based on your needs
    const mergedExpenses = [...existing.expenses, ...local.expenses];
    const mergedIncomes = [...existing.incomes, ...local.incomes];
    const mergedBudgets = local.budgets.length > 0 ? local.budgets : existing.budgets;
    const mergedCategories = [...new Set([...existing.categories, ...local.categories])];
    
    return {
      expenses: mergedExpenses,
      incomes: mergedIncomes,
      budgets: mergedBudgets,
      categories: mergedCategories,
      lastSync: new Date(),
      // Preserve all existing user metadata
      householdId: existing.householdId || undefined,
      isAdmin: existing.isAdmin || false,
      email: existing.email || local.email || '',
      displayName: existing.displayName || local.displayName || '',
      householdRemoved: existing.householdRemoved || false,
      householdRemovedBy: existing.householdRemovedBy || undefined,
      householdRemovedAt: existing.householdRemovedAt || undefined,
    };
  }
}
