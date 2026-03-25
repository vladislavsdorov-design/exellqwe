import React, { createContext, useState, useEffect, useContext } from "react";
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
} from "firebase/firestore";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("user");

  // Функция для создания администратора по умолчанию
  const createDefaultAdmin = async () => {
    try {
      // Проверяем, есть ли уже пользователи
      const usersSnapshot = await getDocs(collection(db, "users"));

      if (usersSnapshot.empty) {
        console.log("Создаем администратора по умолчанию...");

        // Создаем пользователя в Firebase Auth
        const adminEmail = "admin@admin.com";
        const adminPassword = "admin123";

        try {
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            adminEmail,
            adminPassword
          );

          // Обновляем профиль
          await updateProfile(userCredential.user, {
            displayName: "Administrator",
          });

          // Создаем документ в Firestore
          await setDoc(doc(db, "users", userCredential.user.uid), {
            email: adminEmail,
            name: "Administrator",
            role: "admin",
            createdAt: new Date(),
            createdBy: "system",
          });

          console.log("Администратор успешно создан!");
          console.log("Email: admin@admin.com");
          console.log("Password: admin123");
        } catch (authError) {
          if (authError.code === "auth/email-already-in-use") {
            console.log("Администратор уже существует");
          } else {
            console.error("Ошибка создания администратора:", authError);
          }
        }
      }
    } catch (error) {
      console.error("Ошибка проверки пользователей:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
            setUserRole(userDoc.data().role || "user");
          } else {
            const userData = {
              email: user.email,
              name: user.displayName || user.email,
              role: "user",
              createdAt: new Date(),
              createdBy: user.uid,
            };
            await setDoc(doc(db, "users", user.uid), userData);
            setUserData(userData);
            setUserRole("user");
          }
        } catch (error) {
          console.error("Error loading user data:", error);
        }
      } else {
        setUserData(null);
        setUserRole("user");
        // Создаем администратора только если нет пользователей
        await createDefaultAdmin();
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const register = async (email, password, name, role = "user") => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await updateProfile(userCredential.user, { displayName: name });

      await setDoc(doc(db, "users", userCredential.user.uid), {
        email,
        name,
        role,
        createdAt: new Date(),
        createdBy: userCredential.user.uid,
      });

      return userCredential;
    } catch (error) {
      console.error("Register error:", error);
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = () => {
    return signOut(auth);
  };

  const value = {
    currentUser,
    userData,
    userRole,
    register,
    login,
    logout,
    isAdmin: userRole === "admin",
    isManager: userRole === "admin" || userRole === "manager",
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
