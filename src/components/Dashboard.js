import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  deleteDoc,
  limit,
  where,
  getDocs,
} from "firebase/firestore";
import * as XLSX from "xlsx";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  AppBar,
  Toolbar,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Badge,
  Alert,
  Snackbar,
  Grid,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  ListItemButton,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Logout as LogoutIcon,
  NotificationsActive as NotificationsActiveIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import UserManagement from "./UserManagement";
import Settings from "./Settings";
import Notifications from "./Notifications";
import StatCards from "./Dashboard/StatCards";
import AddSchoolForm from "./Dashboard/AddSchoolForm";
import FilterBar from "./Dashboard/FilterBar";
import SchoolTable from "./Dashboard/SchoolTable";
import SchoolChat from "./Dashboard/SchoolChat"; // Импортируем чат

const drawerWidth = 240;

function Dashboard() {
  const { currentUser, userData, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
    }
  }, [currentUser, navigate]);

  const [schools, setSchools] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    progress: "",
    priority: "",
  });

  // Дебаунс поиска: фильтрация сработает только через 300мс после остановки ввода
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [columns, setColumns] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [sortBy, setSortBy] = useState("lastUpdated");
  const [sortOrder, setSortOrder] = useState("desc");
  const [editingSchool, setEditingSchool] = useState(null);
  const [chatSchool, setChatSchool] = useState(null); // Добавляем состояние для чата
  const [reminderSchool, setReminderSchool] = useState(null); // Состояние для диалога напоминаний
  const [reminderHistory, setReminderHistory] = useState([]); // История для диалога напоминаний
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [newSchool, setNewSchool] = useState({
    name: "",
    email: "",
    phone: "",
    progress: "BRAK AKCJI",
    notes: "",
    actions: "",
    priority: "medium",
  });
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(20);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Мемоизация фильтрованных данных
  const filteredAndSortedData = useMemo(() => {
    let filtered = [...schools];

    if (debouncedSearchTerm && typeof debouncedSearchTerm === "string") {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter((school) =>
        (school.name && typeof school.name === "string" && school.name.toLowerCase().includes(term)) ||
        (school.email && typeof school.email === "string" && school.email.toLowerCase().includes(term)) ||
        (school.phone && typeof school.phone === "string" && school.phone.toLowerCase().includes(term))
      );
    }

    if (filters.progress) {
      filtered = filtered.filter(
        (school) => school.progress === filters.progress
      );
    }

    if (filters.priority) {
      filtered = filtered.filter(
        (school) => school.priority === filters.priority
      );
    }

    filtered.sort((a, b) => {
      // Приоритет №1: Активные напоминания (дата наступила)
      const now = new Date();
      const aReminderActive = a.reminderDate && a.reminderText && new Date(a.reminderDate) <= now;
      const bReminderActive = b.reminderDate && b.reminderText && new Date(b.reminderDate) <= now;

      if (aReminderActive && !bReminderActive) return -1;
      if (!aReminderActive && bReminderActive) return 1;

      // Приоритет №2: Наличие любого напоминания (дата в будущем)
      const aHasReminder = a.reminderDate && a.reminderText;
      const bHasReminder = b.reminderDate && b.reminderText;

      if (aHasReminder && !bHasReminder) return -1;
      if (!aHasReminder && bHasReminder) return 1;

      // Обычная сортировка по выбранной колонке
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === "lastUpdated") {
        aVal = a.lastUpdated?.toDate() || new Date(0);
        bVal = b.lastUpdated?.toDate() || new Date(0);
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [schools, searchTerm, filters, sortBy, sortOrder]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let noAction = 0;
    let offerSent = 0;
    let inContact = 0;
    let updatedToday = 0;

    filteredAndSortedData.forEach((s) => {
      if (s.progress === "BRAK AKCJI") noAction++;
      if (s.progress === "OFERTA WYSŁANA") offerSent++;
      if (s.progress === "W KONTAKCIE") inContact++;
      
      if (s.lastUpdated) {
        const updateDate = s.lastUpdated.toDate();
        updateDate.setHours(0, 0, 0, 0);
        if (updateDate.getTime() === today.getTime()) updatedToday++;
      }
    });

    return {
      total: filteredAndSortedData.length,
      noAction,
      offerSent,
      inContact,
      updatedToday,
    };
  }, [filteredAndSortedData]);

  const paginatedSchools = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    return filteredAndSortedData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredAndSortedData, page, rowsPerPage]);

  const checkAndCreateNotifications = useCallback(
    async (schoolsData) => {
      if (!currentUser) return;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const inactiveSchools = schoolsData.filter((school) => {
        return school.lastUpdated &&
          school.lastUpdated.toDate() < sevenDaysAgo &&
          school.progress !== "OFERTA WYSŁANA";
      });

      for (const school of inactiveSchools) {
        const daysInactive = Math.floor(
          (new Date() - school.lastUpdated.toDate()) / (1000 * 60 * 60 * 24)
        );

        const existingNotificationQuery = query(
          collection(db, "notifications"),
          where("userId", "==", currentUser.uid),
          where("schoolId", "==", school.id),
          where("type", "==", "inactive_school")
        );

        const existingSnapshot = await getDocs(existingNotificationQuery);

        if (existingSnapshot.empty) {
          await addDoc(collection(db, "notifications"), {
            userId: currentUser.uid,
            schoolId: school.id,
            schoolName: school.name,
            title: "⚠️ Szkoła nieaktywna",
            message: `Szkoła "${school.name}" nie była aktualizowana od ${daysInactive} dni.`,
            type: "inactive_school",
            priority: daysInactive > 14 ? "high" : daysInactive > 7 ? "medium" : "low",
            createdAt: serverTimestamp(),
            read: false,
          });
        }
      }
    },
    [currentUser]
  );

  useEffect(() => {
    let unsubscribe;

    const loadData = () => {
      const q = query(collection(db, "schools"), orderBy("lastUpdated", "desc"));

      unsubscribe = onSnapshot(
        q,
        async (snapshot) => {
          const schoolsData = [];
          snapshot.forEach((doc) => {
            schoolsData.push({ id: doc.id, ...doc.data() });
          });
          setSchools(schoolsData);

          if (schoolsData.length > 0) {
            checkAndCreateNotifications(schoolsData);
          }
          setIsInitialLoad(false);
        },
        (error) => {
          console.error("Error loading schools:", error);
          setIsInitialLoad(false);
        }
      );
    };

    loadData();
    return () => unsubscribe && unsubscribe();
  }, [checkAndCreateNotifications]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", currentUser.uid),
      where("read", "==", false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotificationsCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    const defaultColumns = [
      { id: "name", label: "Nazwa szkoły", visible: true, width: 200 },
      { id: "contact", label: "Kontakt", visible: true, width: 200 },
      { id: "progress", label: "Progres", visible: true, width: 150 },
      { id: "notes", label: "Notatki", visible: true, width: 250 },
      { id: "actions", label: "Akcje", visible: true, width: 250 },
      { id: "lastUpdated", label: "Aktualizacja", visible: true, width: 180 },
      { id: "lastUpdatedBy", label: "Użytkownik", visible: true, width: 150 },
      { id: "nextAction", label: "Następna akcja", visible: true, width: 200 },
      { id: "priority", label: "Priorytet", visible: true, width: 120 },
    ];

    const savedColumns = localStorage.getItem("visibleColumns");
    if (savedColumns) {
      const visibleIds = JSON.parse(savedColumns);
      const updatedColumns = defaultColumns.map((col) => ({
        ...col,
        visible: visibleIds.includes(col.id),
      }));
      setColumns(updatedColumns);
      setVisibleColumns(updatedColumns.filter((col) => col.visible));
    } else {
      setColumns(defaultColumns);
      setVisibleColumns(defaultColumns);
    }
  }, []);

  const handleSort = useCallback((column) => {
    setSortBy((prevSortBy) => {
      if (prevSortBy === column) {
        setSortOrder((prevOrder) => (prevOrder === "asc" ? "desc" : "asc"));
        return prevSortBy;
      }
      setSortOrder("asc");
      return column;
    });
  }, []);

  const handleUpdate = useCallback(
    async (schoolId, field, value) => {
      try {
        const schoolRef = doc(db, "schools", schoolId);
        const oldValue = schools.find(s => s.id === schoolId)?.[field] || "brak";
        
        await updateDoc(schoolRef, {
          [field]: value,
          lastUpdated: serverTimestamp(),
          lastUpdatedBy: userData?.name || currentUser?.email,
        });

        // Добавляем запись в историю
         await addDoc(collection(db, "actions_log"), {
           schoolId,
           userId: currentUser?.uid,
           user: userData?.name || currentUser?.email,
           action: "Aktualizacja",
           details: `Zmieniono ${field}: "${oldValue}" -> "${value}"`,
           timestamp: serverTimestamp(),
         });

        setSnackbar({
          open: true,
          message: "Zaktualizowano pomyślnie!",
          severity: "success",
        });
      } catch (error) {
        setSnackbar({
          open: true,
          message: "Błąd aktualizacji!",
          severity: "error",
        });
      }
    },
    [currentUser, userData, schools]
  );

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  // Загрузка истории для конкретной школы при открытии напоминаний
  useEffect(() => {
    if (!reminderSchool?.id) {
      setReminderHistory([]);
      return;
    }

    const historyQuery = query(
       collection(db, "actions_log"),
       where("schoolId", "==", reminderSchool.id),
       orderBy("timestamp", "desc"),
       limit(5)
     );

    const unsubscribe = onSnapshot(historyQuery, (snapshot) => {
      const history = [];
      snapshot.forEach((doc) => {
        history.push({ id: doc.id, ...doc.data() });
      });
      setReminderHistory(history);
    });

    return () => unsubscribe();
  }, [reminderSchool?.id]);

  const handleAddSchool = async (e) => {
    e.preventDefault();
    if (!newSchool.name) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "schools"), {
        ...newSchool,
        lastUpdated: serverTimestamp(),
        lastUpdatedBy: userData?.name || currentUser?.email,
        createdBy: userData?.name || currentUser?.email,
        createdAt: serverTimestamp(),
      });
      setNewSchool({
        name: "",
        email: "",
        phone: "",
        progress: "BRAK AKCJI",
        notes: "",
        actions: "",
        priority: "medium",
      });
      setSnackbar({ open: true, message: "Dodano!", severity: "success" });
    } catch (error) {
      setSnackbar({ open: true, message: "Błąd!", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingSchool) return;
    setLoading(true);
    try {
      const schoolRef = doc(db, "schools", editingSchool.id);
      const originalSchool = schools.find((s) => s.id === editingSchool.id);

      await updateDoc(schoolRef, {
        ...editingSchool,
        lastUpdated: serverTimestamp(),
        lastUpdatedBy: userData?.name || currentUser?.email,
      });

      // Логируем изменения
      let changes = [];
      if (originalSchool) {
        if (originalSchool.name !== editingSchool.name)
          changes.push(`Nazwa: "${originalSchool.name}" -> "${editingSchool.name}"`);
        if (originalSchool.email !== editingSchool.email)
          changes.push(`Email: "${originalSchool.email}" -> "${editingSchool.email}"`);
        if (originalSchool.phone !== editingSchool.phone)
          changes.push(`Tel: "${originalSchool.phone}" -> "${editingSchool.phone}"`);
        if (originalSchool.progress !== editingSchool.progress)
          changes.push(
            `Status: "${originalSchool.progress}" -> "${editingSchool.progress}"`
          );
        if (originalSchool.priority !== editingSchool.priority)
          changes.push(
            `Priorytet: "${originalSchool.priority}" -> "${editingSchool.priority}"`
          );
      }

      if (changes.length > 0) {
         await addDoc(collection(db, "actions_log"), {
           schoolId: editingSchool.id,
           userId: currentUser?.uid,
           user: userData?.name || currentUser?.email,
           action: "Edycja",
           details: changes.join(", "),
           timestamp: serverTimestamp(),
         });
       }

      setEditingSchool(null);
      setSnackbar({
        open: true,
        message: "Dane szkoły zaktualizowane!",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Błąd podczas zapisywania!",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchool = useCallback(async (id, name) => {
    if (window.confirm(`Usunąć "${name}"?`)) {
      try {
        await deleteDoc(doc(db, "schools", id));
        setSnackbar({ open: true, message: "Usunięto!", severity: "success" });
      } catch (error) {
        setSnackbar({ open: true, message: "Błąd!", severity: "error" });
      }
    }
  }, []);

  const viewHistory = useCallback(async (schoolId) => {
    try {
      const historyQuery = query(
        collection(db, "actions_log"),
        where("schoolId", "==", schoolId),
        orderBy("timestamp", "desc"),
        limit(20)
      );
      const snapshot = await getDocs(historyQuery);
      const history = [];
      snapshot.forEach((doc) => {
        history.push({ id: doc.id, ...doc.data() });
      });
      setHistoryData(history);
      setShowHistory(true);
    } catch (error) {
      console.error("History fetch error:", error);
      setSnackbar({ open: true, message: "Błąd historii!", severity: "error" });
    }
  }, []);

  const exportToExcel = useCallback(() => {
    const exportData = filteredAndSortedData.slice(0, 500).map((school) => ({
      "Nazwa szkoły": school.name,
      Email: school.email,
      Telefon: school.phone,
      Status: school.progress,
      Notatki: school.notes,
      Akcje: school.actions,
      Priorytet: school.priority,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Szkoły");
    XLSX.writeFile(wb, `szkoly_${new Date().toISOString().split("T")[0]}.xlsx`);
  }, [filteredAndSortedData]);

  const formatDate = useCallback((timestamp) => {
    if (!timestamp) return "Brak";
    try {
      return timestamp.toDate().toLocaleString("pl-PL");
    } catch {
      return "Brak";
    }
  }, []);

  const handlePageChange = useCallback((event, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (isInitialLoad && schools.length === 0) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <Box className="dashboard-content">
            <StatCards stats={stats} />
            <AddSchoolForm
              newSchool={newSchool}
              setNewSchool={setNewSchool}
              handleAddSchool={handleAddSchool}
              loading={loading}
            />
            <FilterBar
              filters={filters}
              setFilters={setFilters}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              handleSearchChange={handleSearchChange}
              exportToExcel={exportToExcel}
            />
            <SchoolTable
              paginatedSchools={paginatedSchools}
              visibleColumns={visibleColumns}
              sortBy={sortBy}
              sortOrder={sortOrder}
              handleSort={handleSort}
              handleUpdate={handleUpdate}
              setEditingSchool={setEditingSchool}
              viewHistory={viewHistory}
              handleDeleteSchool={handleDeleteSchool}
              isAdmin={isAdmin}
              formatDate={formatDate}
              page={page}
              totalPages={Math.ceil(filteredAndSortedData.length / rowsPerPage)}
              handlePageChange={handlePageChange}
              setChatSchool={setChatSchool}
              setReminderSchool={setReminderSchool} // Передаем пропс
            />
          </Box>
        );
      case 1:
        return <UserManagement />;
      case 2:
        return (
          <Settings
            columns={columns}
            setColumns={setColumns}
            setVisibleColumns={setVisibleColumns}
          />
        );
      case 3:
        return <Notifications />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: "flex", bgcolor: "#f4f7fa", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: "white",
          color: "text.primary",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main", mr: 2 }}>
              Panda Schools
            </Typography>
            <Chip
              label={isAdmin ? "Panel Administratora" : "Panel Użytkownika"}
              size="small"
              color={isAdmin ? "error" : "primary"}
              variant="outlined"
            />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {userData?.name || currentUser?.email}
            </Typography>
            <Button onClick={logout} startIcon={<LogoutIcon />} color="error" size="small" variant="outlined">
              Wyloguj
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: "1px solid #e0e0e0",
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: "auto", mt: 2 }}>
          <List sx={{ px: 1 }}>
            {[
              { text: "Dashboard", icon: <DashboardIcon />, tab: 0 },
              { text: "Użytkownicy", icon: <PeopleIcon />, tab: 1, adminOnly: true },
              { text: "Ustawienia", icon: <SettingsIcon />, tab: 2 },
              { text: "Powiadomienia", icon: <NotificationsIcon />, tab: 3 },
            ].map((item) => {
              if (item.adminOnly && !isAdmin) return null;
              return (
                <ListItem
                  key={item.text}
                  disablePadding
                  className={`nav-list-item ${activeTab === item.tab ? "active" : ""}`}
                >
                  <ListItemButton
                    onClick={() => setActiveTab(item.tab)}
                    sx={{ borderRadius: 1 }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} />
                    {item.text === "Powiadomienia" && notificationsCount > 0 && (
                      <Badge badgeContent={notificationsCount} color="error" sx={{ ml: 1 }} />
                    )}
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />
        {renderContent()}
      </Box>

      {/* Chat Sidebar/Overlay */}
      {chatSchool && (
        <Box
          sx={{
            position: "fixed",
            right: 24,
            bottom: 80,
            width: 800,
            zIndex: 1300,
          }}
        >
          <SchoolChat
            school={chatSchool}
            onClose={() => setChatSchool(null)}
          />
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Dialog open={!!editingSchool} onClose={() => setEditingSchool(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edytuj dane szkoły</DialogTitle>
        <DialogContent dividers>
          {editingSchool && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nazwa школы"
                  value={editingSchool.name}
                  onChange={(e) => setEditingSchool({ ...editingSchool, name: e.target.value })}
                />
              </Grid>
              <Grid xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  value={editingSchool.email}
                  onChange={(e) => setEditingSchool({ ...editingSchool, email: e.target.value })}
                />
              </Grid>
              <Grid xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Telefon"
                  value={editingSchool.phone}
                  onChange={(e) => setEditingSchool({ ...editingSchool, phone: e.target.value })}
                />
              </Grid>
              <Grid xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={editingSchool.progress}
                    onChange={(e) => setEditingSchool({ ...editingSchool, progress: e.target.value })}
                    label="Status"
                  >
                    <MenuItem value="BRAK AKCJI">BRAK AKCJI</MenuItem>
                    <MenuItem value="OFERTA WYSŁANA">OFERTA WYSŁANA</MenuItem>
                    <MenuItem value="W KONTAKCIE">W KONTAKCIE</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Priorytet</InputLabel>
                  <Select
                    value={editingSchool.priority}
                    onChange={(e) => setEditingSchool({ ...editingSchool, priority: e.target.value })}
                    label="Priorytet"
                  >
                    <MenuItem value="high">Wysoki</MenuItem>
                    <MenuItem value="medium">Średni</MenuItem>
                    <MenuItem value="low">Niski</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Następna akcja"
                  value={editingSchool.nextAction || ""}
                  onChange={(e) => setEditingSchool({ ...editingSchool, nextAction: e.target.value })}
                />
              </Grid>
              <Grid xs={12}>
                <TextField
                  fullWidth
                  label="Notatki"
                  multiline
                  rows={3}
                  value={editingSchool.notes || ""}
                  onChange={(e) => setEditingSchool({ ...editingSchool, notes: e.target.value })}
                />
              </Grid>
              <Grid xs={12}>
                <TextField
                  fullWidth
                  label="Akcje для recepcji"
                  multiline
                  rows={3}
                  value={editingSchool.actions || ""}
                  onChange={(e) => setEditingSchool({ ...editingSchool, actions: e.target.value })}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditingSchool(null)}>Anuluj</Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={loading}>
            Zapisz zmiany
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showHistory} onClose={() => setShowHistory(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Historia zmian</DialogTitle>
        <DialogContent dividers>
          {historyData.length > 0 ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>Użytkownik</TableCell>
                  <TableCell>Akcja</TableCell>
                  <TableCell>Szczegóły</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historyData.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{formatDate(log.timestamp)}</TableCell>
                    <TableCell>{log.user}</TableCell>
                    <TableCell>
                      <Chip label={log.action} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.875rem" }}>{log.details}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <Typography color="textSecondary">Brak historii для tej szkoły.</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowHistory(false)} variant="contained">
            Zamknij
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог напоминаний */}
      <Dialog open={!!reminderSchool} onClose={() => setReminderSchool(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
          <NotificationsActiveIcon color="primary" />
          Przypomnienie: {reminderSchool?.name}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid xs={12} md={7}>
              <Box sx={{ py: 1 }}>
                <TextField
                  fullWidth
                  label="Tekst przypomnienia"
                  multiline
                  rows={4}
                  value={reminderSchool?.reminderText || ""}
                  onChange={(e) => setReminderSchool({ ...reminderSchool, reminderText: e.target.value })}
                  sx={{ mb: 3 }}
                />
                <TextField
                  fullWidth
                  label="Data i czas"
                  type="datetime-local"
                  value={reminderSchool?.reminderDate || ""}
                  onChange={(e) => setReminderSchool({ ...reminderSchool, reminderDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            </Grid>
            <Grid xs={12} md={5}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "textSecondary" }}>
                Ostatnia historia
              </Typography>
              <Box sx={{ maxHeight: 200, overflowY: "auto" }}>
                {reminderHistory.length > 0 ? (
                  reminderHistory.map((log) => (
                    <Box key={log.id} sx={{ mb: 1.5, p: 1, bgcolor: "#f8f9fa", borderRadius: 1, borderLeft: "3px solid #1976d2" }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: "block" }}>
                        {log.user} • {formatDate(log.timestamp)}
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: "0.75rem" }}>
                        {log.details}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Typography variant="caption" color="textSecondary">Brak historii.</Typography>
                )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
          <Button 
            startIcon={<CheckCircleIcon />} 
            color="success" 
            variant="outlined"
            onClick={async () => {
              try {
                const schoolRef = doc(db, "schools", reminderSchool.id);
                const oldText = reminderSchool.reminderText;
                
                await updateDoc(schoolRef, {
                  reminderText: "",
                  reminderDate: "",
                  lastUpdated: serverTimestamp(),
                  lastUpdatedBy: userData?.name || currentUser.email,
                });

                // Логируем выполнение в историю
                 await addDoc(collection(db, "actions_log"), {
                   schoolId: reminderSchool.id,
                   userId: currentUser.uid,
                   user: userData?.name || currentUser.email,
                   action: "Wykonano",
                   details: `Zakończono zadanie: "${oldText}"`,
                   timestamp: serverTimestamp(),
                 });

                setReminderSchool(null);
                setSnackbar({ open: true, message: "Zadanie oznaczone jako wykonane!", severity: "success" });
              } catch (error) {
                console.error("Error in Wykonano button:", error);
                setSnackbar({ open: true, message: `Błąd zapisu! ${error.message}`, severity: "error" });
              }
            }}
          >
            Wykonano
          </Button>
          <Box>
            <Button onClick={() => setReminderSchool(null)} sx={{ mr: 1 }}>Anuluj</Button>
            <Button 
              onClick={async () => {
                try {
                  if (!reminderSchool?.id) throw new Error("Missing school ID");
                  
                  const schoolRef = doc(db, "schools", reminderSchool.id);
                  await updateDoc(schoolRef, {
                    reminderText: reminderSchool.reminderText || "",
                    reminderDate: reminderSchool.reminderDate || "",
                    lastUpdated: serverTimestamp(),
                    lastUpdatedBy: userData?.name || currentUser?.email,
                  });

                  // Логируем в историю
                   await addDoc(collection(db, "actions_log"), {
                     schoolId: reminderSchool.id,
                     userId: currentUser?.uid,
                     user: userData?.name || currentUser?.email,
                     action: "Przypomnienie",
                     details: `Ustawiono przypomnienie на ${reminderSchool.reminderDate || "brak daty"}`,
                     timestamp: serverTimestamp(),
                   });

                  setReminderSchool(null);
                  setSnackbar({ open: true, message: "Przypomnienie zapisane!", severity: "success" });
                } catch (error) {
                  console.error("Error in Save Przypomnienie:", error);
                  setSnackbar({ open: true, message: `Błąd zapisu! ${error.message}`, severity: "error" });
                }
              }} 
              variant="contained"
            >
              Zapisz
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Dashboard;
