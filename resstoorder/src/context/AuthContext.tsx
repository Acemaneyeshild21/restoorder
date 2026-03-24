import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'client' | 'admin' | 'cuisine' | 'livreur';
  points?: number;
  loyaltyHistory?: any[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  signup: (name: string, email: string, password?: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<string>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // First fetch or create to ensure document exists
        await ensureProfileExists(firebaseUser.uid, firebaseUser.email || '', firebaseUser.displayName || '');
        
        // Then subscribe to real-time updates
        unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            let role = data.role as 'client' | 'admin' | 'cuisine' | 'livreur';
            if (firebaseUser.email === 'dimitriaceman614@gmail.com') role = 'admin';
            
            setUser({
              id: firebaseUser.uid,
              name: data.first_name ? `${data.first_name} ${data.last_name || ''}`.trim() : (firebaseUser.displayName || (firebaseUser.email || '').split('@')[0]),
              email: data.email || firebaseUser.email,
              role,
              points: data.points || 0,
              loyaltyHistory: data.loyaltyHistory || []
            });
            setIsLoading(false);
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          setIsLoading(false);
        });
      } else {
        if (unsubscribeProfile) unsubscribeProfile();
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const ensureProfileExists = async (userId: string, email: string, name: string = '') => {
    try {
      const docRef = doc(db, 'users', userId);
      let docSnap;
      try {
        docSnap = await getDoc(docRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${userId}`);
        return;
      }

      if (!docSnap.exists()) {
        const isAdminEmail = email === 'dimitriaceman614@gmail.com' || email === 'milo@gmail.com';
        const role = isAdminEmail ? 'admin' : 'client';
        let firstName = name;
        let lastName = '';
        
        if (name && name.includes(' ')) {
          const parts = name.split(' ');
          firstName = parts[0];
          lastName = parts.slice(1).join(' ');
        } else if (!name) {
          firstName = email.split('@')[0];
        }

        const newProfile = {
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: '',
          role,
          points: 0,
          loyaltyHistory: []
        };
        try {
          await setDoc(docRef, newProfile);
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
        }
      }
    } catch (err) {
      console.error('Error in ensureProfileExists:', err);
    }
  };

  const login = async (email: string, password?: string) => {
    if (!password) throw new Error("Mot de passe requis");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (error: any) {
      console.error("Login error:", error);
      
      const errorMessage = error.message || "";
      const errorCode = error.code || "";
      
      if (
        errorCode === 'auth/user-not-found' || 
        errorCode === 'auth/wrong-password' || 
        errorCode === 'auth/invalid-credential' ||
        errorMessage.includes('auth/user-not-found') ||
        errorMessage.includes('auth/wrong-password') ||
        errorMessage.includes('auth/invalid-credential')
      ) {
        throw new Error("Email ou mot de passe incorrect.");
      } else if (errorCode === 'auth/invalid-email' || errorMessage.includes('auth/invalid-email')) {
        throw new Error("Format d'email invalide.");
      } else if (errorCode === 'auth/user-disabled' || errorMessage.includes('auth/user-disabled')) {
        throw new Error("Ce compte a été désactivé.");
      } else if (errorCode === 'auth/too-many-requests' || errorMessage.includes('auth/too-many-requests')) {
        throw new Error("Trop de tentatives. Veuillez réessayer plus tard.");
      } else if (errorCode === 'auth/operation-not-allowed' || errorMessage.includes('auth/operation-not-allowed')) {
        throw new Error("L'authentification par email/mot de passe n'est pas activée dans la console Firebase.");
      }
      
      throw new Error("Une erreur est survenue lors de la connexion.");
    }
  };

  const signup = async (name: string, email: string, password?: string) => {
    if (!password) throw new Error("Mot de passe requis");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await ensureProfileExists(userCredential.user.uid, email, name);
      return true;
    } catch (error: any) {
      console.error("Signup error:", error);
      
      const errorMessage = error.message || "";
      const errorCode = error.code || "";

      if (errorCode === 'auth/email-already-in-use' || errorMessage.includes('auth/email-already-in-use')) {
        throw new Error("Cet email est déjà utilisé.");
      } else if (errorCode === 'auth/weak-password' || errorMessage.includes('auth/weak-password')) {
        throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
      } else if (errorCode === 'auth/invalid-email' || errorMessage.includes('auth/invalid-email')) {
        throw new Error("Format d'email invalide.");
      } else if (errorCode === 'auth/operation-not-allowed' || errorMessage.includes('auth/operation-not-allowed')) {
        throw new Error("L'authentification par email/mot de passe n'est pas activée dans la console Firebase.");
      }
      
      throw new Error("Une erreur est survenue lors de l'inscription.");
    }
  };

  const loginWithGoogle = async (): Promise<string> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await ensureProfileExists(result.user.uid, result.user.email || '', result.user.displayName || '');
      return result.user.email || '';
    } catch (error: any) {
      console.error("Google login error:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error("Connexion annulée.");
      } else if (error.code === 'auth/operation-not-allowed') {
        throw new Error("L'authentification Google n'est pas activée dans la console Firebase.");
      }
      throw new Error("Erreur de connexion avec Google.");
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error("Password reset error:", error);
      const errorCode = error.code || (error.message && error.message.includes('auth/') ? error.message.match(/auth\/[a-z-]+/)?.[0] : null);
      
      if (errorCode === 'auth/user-not-found') {
        throw new Error("Aucun compte trouvé avec cette adresse email.");
      } else if (errorCode === 'auth/invalid-email') {
        throw new Error("Format d'email invalide.");
      }
      throw new Error("Une erreur est survenue lors de l'envoi de l'email de réinitialisation.");
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isAdmin: user?.role === 'admin',
      isLoading,
      login, 
      signup,
      loginWithGoogle,
      resetPassword,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
