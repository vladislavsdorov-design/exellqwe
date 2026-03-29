import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Tooltip,
  Grid,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Logout as LogoutIcon,
} from "@mui/icons-material";
import UserManagement from "./UserManagement";
import Settings from "./Settings";
import Notifications from "./Notifications";
import StatCards from "./Dashboard/StatCards";
import AddSchoolForm from "./Dashboard/AddSchoolForm";
import FilterBar from "./Dashboard/FilterBar";
import SchoolTable from "./Dashboard/SchoolTable";
import { debounce } from "lodash";

const drawerWidth = 240;

function Dashboard() {
  const { currentUser, userData, isAdmin, logout } = useAuth();
  const [schools, setSchools] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    progress: "",
    priority: "",
  });
  const [columns, setColumns] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [sortBy, setSortBy] = useState("lastUpdated");
  const [sortOrder, setSortOrder] = useState("desc");
  const [editingSchool, setEditingSchool] = useState(null);
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

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((school) =>
        school.name?.toLowerCase().includes(term) ||
        school.email?.toLowerCase().includes(term) ||
        school.phone?.toLowerCase().includes(term)
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

    return {
      total: filteredAndSortedData.length,
      noAction: filteredAndSortedData.filter((s) => s.progress === "BRAK AKCJI").length,
      offerSent: filteredAndSortedData.filter((s) => s.progress === "OFERTA WYSŁANA").length,
      inContact: filteredAndSortedData.filter((s) => s.progress === "W KONTAKCIE").length,
      updatedToday: filteredAndSortedData.filter((s) => {
        if (!s.lastUpdated) return false;
        const updateDate = s.lastUpdated.toDate();
        updateDate.setHours(0, 0, 0, 0);
        return updateDate.getTime() === today.getTime();
      }).length,
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

  const handleUpdate = useCallback(async (id, field, value) => {
    try {
      const schoolRef = doc(db, "schools", id);
      await updateDoc(schoolRef, {
        [field]: value,
        lastUpdated: serverTimestamp(),
        lastUpdatedBy: userData?.name || currentUser?.email,
      });
      setSnackbar({ open: true, message: "Zapisano!", severity: "success" });
    } catch (error) {
      setSnackbar({ open: true, message: "Błąd!", severity: "error" });
    }
  }, [userData, currentUser]);

  const debouncedSearch = useMemo(
    () => debounce((value) => setSearchTerm(value), 300),
    []
  );

  const handleSearchChange = useCallback((e) => {
    debouncedSearch(e.target.value);
  }, [debouncedSearch]);

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
      await updateDoc(schoolRef, {
        ...editingSchool,
        lastUpdated: serverTimestamp(),
        lastUpdatedBy: userData?.name || currentUser?.email,
      });
      setEditingSchool(null);
      setSnackbar({ open: true, message: "Zaktualizowano!", severity: "success" });
    } catch (error) {
      setSnackbar({ open: true, message: "Błąd!", severity: "error" });
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
        orderBy("timestamp", "desc"),
        limit(50)
      );
      const snapshot = await getDocs(historyQuery);
      const history = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.schoolId === schoolId) {
          history.push({ id: doc.id, ...data });
        }
      });
      setHistoryData(history.slice(0, 20));
      setShowHistory(true);
    } catch (error) {
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
                  button
                  key={item.text}
                  onClick={() => setActiveTab(item.tab)}
                  className={`nav-list-item ${activeTab === item.tab ? "active" : ""}`}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                  {item.text === "Powiadomienia" && notificationsCount > 0 && (
                    <Badge badgeContent={notificationsCount} color="error" sx={{ ml: 1 }} />
                  )}
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
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nazwa szkoły"
                  value={editingSchool.name}
                  onChange={(e) => setEditingSchool({ ...editingSchool, name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  value={editingSchool.email}
                  onChange={(e) => setEditingSchool({ ...editingSchool, email: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Telefon"
                  value={editingSchool.phone}
                  onChange={(e) => setEditingSchool({ ...editingSchool, phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
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
              <Grid item xs={12} md={6}>
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
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Następna akcja"
                  value={editingSchool.nextAction || ""}
                  onChange={(e) => setEditingSchool({ ...editingSchool, nextAction: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notatki"
                  multiline
                  rows={3}
                  value={editingSchool.notes || ""}
                  onChange={(e) => setEditingSchool({ ...editingSchool, notes: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Akcje dla recepcji"
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
              <Typography color="textSecondary">Brak historii dla tej szkoły.</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowHistory(false)} variant="contained">
            Zamknij
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Dashboard;
