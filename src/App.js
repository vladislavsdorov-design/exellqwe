// // src/App.js
// import React, { useState, useEffect } from "react";
// import { db } from "./firebase";
// import {
//   collection,
//   addDoc,
//   updateDoc,
//   doc,
//   onSnapshot,
//   serverTimestamp,
//   query,
//   orderBy,
//   getDoc,
// } from "firebase/firestore";
// import * as XLSX from "xlsx";
// import "./App.css";

// function App() {
//   const [schools, setSchools] = useState([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [filterProgress, setFilterProgress] = useState("");
//   const [editingSchool, setEditingSchool] = useState(null);
//   const [showHistory, setShowHistory] = useState(null);
//   const [recentUpdates, setRecentUpdates] = useState({});

//   const [newSchool, setNewSchool] = useState({
//     name: "",
//     email: "",
//     phone: "",
//     progress: "BRAK AKCJI",
//     notes: "",
//     actions: "",
//     contactPerson: "", // Кто добавил/изменил
//   });

//   // Имитация текущего пользователя (позже замените на реальную аутентификацию)
//   const currentUser = {
//     name: "Admin",
//     email: "admin@example.com",
//   };

//   // Загрузка данных из Firestore
//   useEffect(() => {
//     const q = query(collection(db, "schools"), orderBy("lastUpdated", "desc"));
//     const unsubscribe = onSnapshot(q, (snapshot) => {
//       const schoolsData = [];
//       snapshot.forEach((doc) => {
//         schoolsData.push({ id: doc.id, ...doc.data() });
//       });
//       setSchools(schoolsData);

//       // Проверяем недавние обновления (последние 24 часа)
//       const now = new Date();
//       const updates = {};
//       schoolsData.forEach((school) => {
//         if (school.lastUpdated) {
//           const updateDate = school.lastUpdated.toDate();
//           const hoursDiff = (now - updateDate) / (1000 * 60 * 60);
//           if (hoursDiff < 24) {
//             updates[school.id] = hoursDiff;
//           }
//         }
//       });
//       setRecentUpdates(updates);
//     });

//     return () => unsubscribe();
//   }, []);

//   // Функция для логирования действий
//   const logAction = async (schoolId, action, details) => {
//     const actionLog = {
//       schoolId,
//       action,
//       details,
//       user: currentUser.name,
//       userEmail: currentUser.email,
//       timestamp: serverTimestamp(),
//     };

//     try {
//       await addDoc(collection(db, "actions_log"), actionLog);
//     } catch (error) {
//       console.error("Ошибка логирования:", error);
//     }
//   };

//   // Загрузка XLSX файла
//   const handleFileUpload = async (e) => {
//     const file = e.target.files[0];
//     if (file) {
//       const reader = new FileReader();

//       reader.onload = async (event) => {
//         const data = new Uint8Array(event.target.result);
//         const workbook = XLSX.read(data, { type: "array" });
//         const firstSheetName = workbook.SheetNames[0];
//         const worksheet = workbook.Sheets[firstSheetName];
//         const jsonData = XLSX.utils.sheet_to_json(worksheet);

//         let addedCount = 0;
//         for (let row of jsonData) {
//           await addDoc(collection(db, "schools"), {
//             name: row["Nazwa szkoły"] || "",
//             email: row["Kolumna1"] || row["Preferowany kontakt"] || "",
//             phone: row["Nr telefonu"] || "",
//             progress: row["Progres"] || "BRAK AKCJI",
//             pilotCrew: row["Pilot/Cabin Crew"] || "",
//             response: row["odpowiedź?"] || "",
//             notes: row["Notatki"] || "",
//             actions: row["Akcje dla recepcji "] || "",
//             contactPerson: currentUser.name,
//             lastUpdated: serverTimestamp(),
//             createdBy: currentUser.name,
//             createdAt: serverTimestamp(),
//           });
//           addedCount++;
//         }

//         await logAction(
//           null,
//           "IMPORT_EXCEL",
//           `Импортировано ${addedCount} школ`
//         );
//         alert(
//           `Успешно загружено ${addedCount} школ! (Pomyślnie załadowano ${addedCount} szkół!)`
//         );
//       };

//       reader.readAsArrayBuffer(file);
//     }
//   };

//   const handleAddSchool = async (e) => {
//     e.preventDefault();
//     if (!newSchool.name) return;

//     await addDoc(collection(db, "schools"), {
//       ...newSchool,
//       contactPerson: currentUser.name,
//       createdBy: currentUser.name,
//       createdAt: serverTimestamp(),
//       lastUpdated: serverTimestamp(),
//     });

//     await logAction(null, "ADD_SCHOOL", `Добавлена школа: ${newSchool.name}`);

//     setNewSchool({
//       name: "",
//       email: "",
//       phone: "",
//       progress: "BRAK AKCJI",
//       notes: "",
//       actions: "",
//       contactPerson: "",
//     });
//   };

//   const handleUpdate = async (id, field, value) => {
//     const schoolRef = doc(db, "schools", id);
//     const oldSchool = schools.find((s) => s.id === id);

//     await updateDoc(schoolRef, {
//       [field]: value,
//       lastUpdated: serverTimestamp(),
//       lastUpdatedBy: currentUser.name,
//     });

//     await logAction(
//       id,
//       "UPDATE_FIELD",
//       `Поле "${field}" изменено с "${oldSchool?.[field]}" на "${value}"`
//     );
//   };

//   // Сохранение всех изменений из модального окна
//   const handleSaveEdit = async () => {
//     if (!editingSchool) return;

//     const schoolRef = doc(db, "schools", editingSchool.id);
//     const updates = {};
//     const changes = [];

//     // Собираем только измененные поля
//     for (let key in editingSchool) {
//       if (
//         key !== "id" &&
//         editingSchool[key] !==
//           schools.find((s) => s.id === editingSchool.id)[key]
//       ) {
//         updates[key] = editingSchool[key];
//         changes.push(
//           `${key}: ${schools.find((s) => s.id === editingSchool.id)[key]} → ${
//             editingSchool[key]
//           }`
//         );
//       }
//     }

//     if (Object.keys(updates).length > 0) {
//       await updateDoc(schoolRef, {
//         ...updates,
//         lastUpdated: serverTimestamp(),
//         lastUpdatedBy: currentUser.name,
//       });

//       await logAction(
//         editingSchool.id,
//         "EDIT_SCHOOL",
//         `Изменения: ${changes.join(", ")}`
//       );
//     }

//     setEditingSchool(null);
//   };

//   // Просмотр истории изменений
//   const viewHistory = async (schoolId) => {
//     const historyQuery = query(
//       collection(db, "actions_log"),
//       orderBy("timestamp", "desc")
//     );

//     const unsubscribe = onSnapshot(historyQuery, (snapshot) => {
//       const history = [];
//       snapshot.forEach((doc) => {
//         const data = doc.data();
//         if (data.schoolId === schoolId) {
//           history.push({ id: doc.id, ...data });
//         }
//       });
//       setShowHistory(history);
//     });

//     return () => unsubscribe();
//   };

//   const formatDate = (timestamp) => {
//     if (!timestamp) return "Brak";
//     const date = timestamp.toDate();
//     return date.toLocaleString("pl-PL");
//   };

//   const getRecentUpdateStyle = (schoolId) => {
//     if (recentUpdates[schoolId]) {
//       const hours = Math.floor(recentUpdates[schoolId]);
//       const minutes = Math.floor((recentUpdates[schoolId] % 1) * 60);
//       const opacity = Math.max(0.3, 1 - recentUpdates[schoolId] / 24);
//       return {
//         backgroundColor: `rgba(255, 255, 0, ${opacity})`,
//         transition: "background-color 0.5s ease",
//       };
//     }
//     return {};
//   };

//   const filteredSchools = schools.filter((school) => {
//     const matchSearch = school.name
//       ?.toLowerCase()
//       .includes(searchTerm.toLowerCase());
//     const matchProgress = filterProgress
//       ? school.progress === filterProgress
//       : true;
//     return matchSearch && matchProgress;
//   });

//   return (
//     <div style={{ padding: "20px", fontFamily: "Arial" }}>
//       <h1>Zarządzanie Szkołami (Управление школами)</h1>

//       {/* Информация о текущем пользователе */}
//       <div
//         style={{
//           marginBottom: "20px",
//           padding: "10px",
//           background: "#e3f2fd",
//           borderRadius: "5px",
//         }}
//       >
//         <strong>Текущий пользователь / Aktualny użytkownik:</strong>{" "}
//         {currentUser.name} ({currentUser.email})
//       </div>

//       {/* Секция загрузки Excel */}
//       <div
//         style={{ marginBottom: "20px", padding: "10px", background: "#f0f0f0" }}
//       >
//         <h3>Wgraj dane z Excela (.xlsx)</h3>
//         <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />

//         <hr style={{ margin: "20px 0" }} />

//         <h3>Szukaj i filtruj</h3>
//         <input
//           type="text"
//           placeholder="Szukaj po nazwie szkoły..."
//           value={searchTerm}
//           onChange={(e) => setSearchTerm(e.target.value)}
//           style={{ padding: "5px", marginRight: "10px", width: "300px" }}
//         />
//         <select
//           onChange={(e) => setFilterProgress(e.target.value)}
//           value={filterProgress}
//           style={{ padding: "5px" }}
//         >
//           <option value="">Wszystkie statusy</option>
//           <option value="BRAK AKCJI">BRAK AKCJI</option>
//           <option value="OFERTA WYSŁANA">OFERTA WYSŁANA</option>
//           <option value="W KONTAKCIE">W KONTAKCIE</option>
//         </select>
//       </div>

//       {/* Форма добавления новой школы */}
//       <div
//         style={{
//           marginBottom: "20px",
//           padding: "10px",
//           border: "1px solid #ccc",
//         }}
//       >
//         <h3>Dodaj nową szkołę</h3>
//         <form onSubmit={handleAddSchool}>
//           <input
//             required
//             placeholder="Nazwa szkoły"
//             value={newSchool.name}
//             onChange={(e) =>
//               setNewSchool({ ...newSchool, name: e.target.value })
//             }
//             style={{ margin: "5px" }}
//           />
//           <input
//             placeholder="Email"
//             value={newSchool.email}
//             onChange={(e) =>
//               setNewSchool({ ...newSchool, email: e.target.value })
//             }
//             style={{ margin: "5px" }}
//           />
//           <input
//             placeholder="Telefon"
//             value={newSchool.phone}
//             onChange={(e) =>
//               setNewSchool({ ...newSchool, phone: e.target.value })
//             }
//             style={{ margin: "5px" }}
//           />
//           <select
//             value={newSchool.progress}
//             onChange={(e) =>
//               setNewSchool({ ...newSchool, progress: e.target.value })
//             }
//             style={{ margin: "5px" }}
//           >
//             <option value="BRAK AKCJI">BRAK AKCJI</option>
//             <option value="OFERTA WYSŁANA">OFERTA WYSŁANA</option>
//             <option value="W KONTAKCIE">W KONTAKCIE</option>
//           </select>
//           <button type="submit" style={{ padding: "5px 10px" }}>
//             Dodaj
//           </button>
//         </form>
//       </div>

//       {/* Таблица школ */}
//       <table
//         border="1"
//         cellPadding="10"
//         style={{ width: "100%", borderCollapse: "collapse" }}
//       >
//         <thead style={{ background: "#ddd" }}>
//           <tr>
//             <th>Nazwa szkoły</th>
//             <th>Kontakt (Email / Tel)</th>
//             <th>Progres</th>
//             <th>Notatki</th>
//             <th>Akcje dla recepcji</th>
//             <th>Ostatnia aktualizacja</th>
//             <th>Akcje</th>
//           </tr>
//         </thead>
//         <tbody>
//           {filteredSchools.map((school) => (
//             <tr key={school.id} style={getRecentUpdateStyle(school.id)}>
//               <td>
//                 {school.name}
//                 {school.createdBy && (
//                   <div style={{ fontSize: "10px", color: "#666" }}>
//                     Dodano: {school.createdBy} ({formatDate(school.createdAt)})
//                   </div>
//                 )}
//               </td>
//               <td>
//                 <div>📧 {school.email}</div>
//                 <div>📞 {school.phone}</div>
//               </td>
//               <td>
//                 <select
//                   value={school.progress}
//                   onChange={(e) =>
//                     handleUpdate(school.id, "progress", e.target.value)
//                   }
//                   style={{ width: "100%" }}
//                 >
//                   <option value="BRAK AKCJI">❌ BRAK AKCJI</option>
//                   <option value="OFERTA WYSŁANA">📨 OFERTA WYSŁANA</option>
//                   <option value="W KONTAKCIE">📞 W KONTAKCIE</option>
//                 </select>
//               </td>
//               <td>
//                 <textarea
//                   value={school.notes || ""}
//                   onChange={(e) =>
//                     handleUpdate(school.id, "notes", e.target.value)
//                   }
//                   placeholder="Dodaj notatkę..."
//                   rows="3"
//                   style={{ width: "100%" }}
//                 />
//               </td>
//               <td>
//                 <textarea
//                   value={school.actions || ""}
//                   onChange={(e) =>
//                     handleUpdate(school.id, "actions", e.target.value)
//                   }
//                   placeholder="Akcje..."
//                   rows="3"
//                   style={{ width: "100%" }}
//                 />
//               </td>
//               <td style={{ fontSize: "12px", color: "#555" }}>
//                 {formatDate(school.lastUpdated)}
//                 {school.lastUpdatedBy && (
//                   <div style={{ fontSize: "10px" }}>
//                     przez: {school.lastUpdatedBy}
//                   </div>
//                 )}
//               </td>
//               <td>
//                 <button
//                   onClick={() => setEditingSchool(school)}
//                   style={{
//                     marginBottom: "5px",
//                     padding: "5px 10px",
//                     background: "#4CAF50",
//                     color: "white",
//                     border: "none",
//                     borderRadius: "3px",
//                     cursor: "pointer",
//                   }}
//                 >
//                   ✏️ Edytuj
//                 </button>
//                 <br />
//                 <button
//                   onClick={() => viewHistory(school.id)}
//                   style={{
//                     padding: "5px 10px",
//                     background: "#2196F3",
//                     color: "white",
//                     border: "none",
//                     borderRadius: "3px",
//                     cursor: "pointer",
//                   }}
//                 >
//                   📜 Historia
//                 </button>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>

//       {/* Модальное окно редактирования */}
//       {editingSchool && (
//         <div
//           style={{
//             position: "fixed",
//             top: 0,
//             left: 0,
//             right: 0,
//             bottom: 0,
//             backgroundColor: "rgba(0,0,0,0.5)",
//             display: "flex",
//             justifyContent: "center",
//             alignItems: "center",
//             zIndex: 1000,
//           }}
//         >
//           <div
//             style={{
//               backgroundColor: "white",
//               padding: "20px",
//               borderRadius: "10px",
//               width: "80%",
//               maxWidth: "600px",
//               maxHeight: "80%",
//               overflow: "auto",
//             }}
//           >
//             <h2>Edytuj szkołę: {editingSchool.name}</h2>

//             <div style={{ marginBottom: "10px" }}>
//               <label>Nazwa szkoły:</label>
//               <input
//                 type="text"
//                 value={editingSchool.name || ""}
//                 onChange={(e) =>
//                   setEditingSchool({ ...editingSchool, name: e.target.value })
//                 }
//                 style={{ width: "100%", padding: "5px", marginTop: "5px" }}
//               />
//             </div>

//             <div style={{ marginBottom: "10px" }}>
//               <label>Email:</label>
//               <input
//                 type="email"
//                 value={editingSchool.email || ""}
//                 onChange={(e) =>
//                   setEditingSchool({ ...editingSchool, email: e.target.value })
//                 }
//                 style={{ width: "100%", padding: "5px", marginTop: "5px" }}
//               />
//             </div>

//             <div style={{ marginBottom: "10px" }}>
//               <label>Telefon:</label>
//               <input
//                 type="text"
//                 value={editingSchool.phone || ""}
//                 onChange={(e) =>
//                   setEditingSchool({ ...editingSchool, phone: e.target.value })
//                 }
//                 style={{ width: "100%", padding: "5px", marginTop: "5px" }}
//               />
//             </div>

//             <div style={{ marginBottom: "10px" }}>
//               <label>Status:</label>
//               <select
//                 value={editingSchool.progress || "BRAK AKCJI"}
//                 onChange={(e) =>
//                   setEditingSchool({
//                     ...editingSchool,
//                     progress: e.target.value,
//                   })
//                 }
//                 style={{ width: "100%", padding: "5px", marginTop: "5px" }}
//               >
//                 <option value="BRAK AKCJI">BRAK AKCJI</option>
//                 <option value="OFERTA WYSŁANA">OFERTA WYSŁANA</option>
//                 <option value="W KONTAKCIE">W KONTAKCIE</option>
//               </select>
//             </div>

//             <div style={{ marginBottom: "10px" }}>
//               <label>Notatki:</label>
//               <textarea
//                 value={editingSchool.notes || ""}
//                 onChange={(e) =>
//                   setEditingSchool({ ...editingSchool, notes: e.target.value })
//                 }
//                 rows="4"
//                 style={{ width: "100%", padding: "5px", marginTop: "5px" }}
//               />
//             </div>

//             <div style={{ marginBottom: "10px" }}>
//               <label>Akcje dla recepcji:</label>
//               <textarea
//                 value={editingSchool.actions || ""}
//                 onChange={(e) =>
//                   setEditingSchool({
//                     ...editingSchool,
//                     actions: e.target.value,
//                   })
//                 }
//                 rows="4"
//                 style={{ width: "100%", padding: "5px", marginTop: "5px" }}
//               />
//             </div>

//             <div
//               style={{
//                 display: "flex",
//                 gap: "10px",
//                 justifyContent: "flex-end",
//               }}
//             >
//               <button
//                 onClick={() => setEditingSchool(null)}
//                 style={{
//                   padding: "10px 20px",
//                   background: "#f44336",
//                   color: "white",
//                   border: "none",
//                   borderRadius: "3px",
//                   cursor: "pointer",
//                 }}
//               >
//                 Anuluj
//               </button>
//               <button
//                 onClick={handleSaveEdit}
//                 style={{
//                   padding: "10px 20px",
//                   background: "#4CAF50",
//                   color: "white",
//                   border: "none",
//                   borderRadius: "3px",
//                   cursor: "pointer",
//                 }}
//               >
//                 Zapisz
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Модальное окно истории */}
//       {showHistory && (
//         <div
//           style={{
//             position: "fixed",
//             top: 0,
//             left: 0,
//             right: 0,
//             bottom: 0,
//             backgroundColor: "rgba(0,0,0,0.5)",
//             display: "flex",
//             justifyContent: "center",
//             alignItems: "center",
//             zIndex: 1000,
//           }}
//         >
//           <div
//             style={{
//               backgroundColor: "white",
//               padding: "20px",
//               borderRadius: "10px",
//               width: "80%",
//               maxWidth: "800px",
//               maxHeight: "80%",
//               overflow: "auto",
//             }}
//           >
//             <h2>Historia zmian</h2>
//             <table style={{ width: "100%", borderCollapse: "collapse" }}>
//               <thead>
//                 <tr style={{ background: "#f0f0f0" }}>
//                   <th>Data</th>
//                   <th>Użytkownik</th>
//                   <th>Akcja</th>
//                   <th>Szczegóły</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {showHistory.map((log, index) => (
//                   <tr key={index}>
//                     <td>{formatDate(log.timestamp)}</td>
//                     <td>{log.user}</td>
//                     <td>{log.action}</td>
//                     <td>{log.details}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//             <button
//               onClick={() => setShowHistory(null)}
//               style={{
//                 marginTop: "20px",
//                 padding: "10px 20px",
//                 background: "#2196F3",
//                 color: "white",
//                 border: "none",
//                 borderRadius: "3px",
//                 cursor: "pointer",
//               }}
//             >
//               Zamknij
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// export default App;
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { AuthProvider } from "./contexts/AuthContext";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";

const theme = createTheme({
  typography: {
    fontFamily:
      '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, "Noto Sans", sans-serif',
    h1: { fontFamily: '"Montserrat", "Inter", sans-serif' },
    h2: { fontFamily: '"Montserrat", "Inter", sans-serif' },
    h3: { fontFamily: '"Montserrat", "Inter", sans-serif' },
    h4: { fontFamily: '"Montserrat", "Inter", sans-serif' },
    h5: { fontFamily: '"Montserrat", "Inter", sans-serif' },
    h6: { fontFamily: '"Montserrat", "Inter", sans-serif' },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
