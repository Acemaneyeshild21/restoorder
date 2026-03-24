import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';

export function useFirebaseConnection() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkConnection() {
      try {
        // Simple query to check if the connection works
        const q = query(collection(db, 'categories'), limit(1));
        await getDocs(q);
        
        setIsConnected(true);
      } catch (err: any) {
        console.error('Firebase connection exception:', err);
        setIsConnected(false);
        setError(err.message);
      }
    }

    checkConnection();
  }, []);

  return { isConnected, error };
}
