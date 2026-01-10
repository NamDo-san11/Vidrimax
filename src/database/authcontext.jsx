// src/database/authcontext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { appfirebase } from "./firebaseconfig";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Estado para notificaciones de conexión
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const auth = getAuth(appfirebase);

    // Persistencia de usuario
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoggedIn(!!firebaseUser);
      setInitializing(false);
    });

    // Manejo de conexión/desconexión
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Cerrar sesión
  const logout = async () => {
    const auth = getAuth(appfirebase);
    await signOut(auth);
    setUser(null);
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoggedIn, initializing, logout, isOnline }}
    >
      {/* Banner de conexión */}
      {!isOnline && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          background: "#dc3545",
          color: "white",
          textAlign: "center",
          padding: "0.5rem",
          zIndex: 10000
        }}>
          Sin conexión a internet
        </div>
      )}

      {children}
    </AuthContext.Provider>
  );
};
