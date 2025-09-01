import React, { createContext, useContext, useEffect, useState } from 'react';
import auth from '@react-native-firebase/auth';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [idToken, setIdToken] = useState(null);
    const [initializing, setInitializing] = useState(true);

    useEffect(() => {
        // fires on sign-in / sign-out
        const unsubAuth = auth().onAuthStateChanged(async (u) => {
            setUser(u || null);
            setInitializing(false);
        });

        // keeps token in sync (optional to read it)
        const unsubToken = auth().onIdTokenChanged(async (u) => {
            if (u) {
                const token = await u.getIdToken(); // fresh token
                setIdToken(token);
            } else {
                setIdToken(null);
            }
        });

        return () => {
            unsubAuth();
            unsubToken();
        };
    }, []);

    const value = { user, idToken, initializing };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
