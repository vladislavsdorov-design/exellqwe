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
} from "firebase/firestore";
import * as XLSX from "xlsx";
import {
  Container,
  Paper,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Chip,
  IconButton,
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
  Card,
  CardContent,
  LinearProgress,
  CircularProgress,
  Pagination,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Delete as DeleteIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Logout as LogoutIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import UserManagement from "./UserManagement";
import Settings from "./Settings";
import Notifications from "./Notifications";
import { debounce } from "lodash"; // Установите: npm install lodash

const drawerWidth = 240;

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  fontWeight: "bold",
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.common.white,
}));

function Dashboard() {
  const { currentUser, userData, userRole, isAdmin, logout } = useAuth();
  const [schools, setSchools] = useState([]);
  const [filteredSchools, setFilteredSchools] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({});
  const [columns, setColumns] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [sortBy, setSortBy] = useState("lastUpdated");
  const [sortOrder, setSortOrder] = useState("desc");
  const [editingSchool, setEditingSchool] = useState(null);
  const [showHistory, setShowHistory] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    noAction: 0,
    offerSent: 0,
    inContact: 0,
    updatedToday: 0,
  });
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
  const [rowsPerPage, setRowsPerPage] = useState(20); // Ограничиваем количество записей на странице
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Мемоизация фильтрованных данных для оптимизации
  const filteredAndSortedData = useMemo(() => {
    let filtered = [...schools];

    // Поиск по названию
    if (searchTerm) {
      filtered = filtered.filter((school) =>
        school.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Применяем фильтры
    Object.keys(filters).forEach((key) => {
      if (filters[key]) {
        filtered = filtered.filter((school) => school[key] === filters[key]);
      }
    });

    // Сортировка
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

  // Обновляем отображаемые данные при изменении фильтров
  useEffect(() => {
    setFilteredSchools(filteredAndSortedData);
    updateStats(filteredAndSortedData);
    setIsInitialLoad(false);
  }, [filteredAndSortedData]);

  // Загрузка данных из Firestore с оптимизацией
  useEffect(() => {
    let unsubscribe;

    const loadData = () => {
      // Используем query с лимитом для начальной загрузки
      const q = query(
        collection(db, "schools"),
        orderBy("lastUpdated", "desc")
      );

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const schoolsData = [];
          snapshot.forEach((doc) => {
            schoolsData.push({ id: doc.id, ...doc.data() });
          });
          setSchools(schoolsData);
          checkForNotifications(schoolsData);
        },
        (error) => {
          console.error("Error loading schools:", error);
        }
      );
    };

    loadData();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Загрузка настроек колонок
  useEffect(() => {
    loadColumnSettings();
  }, []);

  const loadColumnSettings = () => {
    const defaultColumns = [
      { id: "name", label: "Nazwa szkoły", visible: true, width: 200 },
      { id: "contact", label: "Kontakt", visible: true, width: 200 },
      { id: "progress", label: "Progres", visible: true, width: 150 },
      { id: "notes", label: "Notatki", visible: true, width: 250 },
      { id: "actions", label: "Akcje", visible: true, width: 250 },
      {
        id: "lastUpdated",
        label: "Ostatnia aktualizacja",
        visible: true,
        width: 180,
      },
      { id: "lastUpdatedBy", label: "Zmodyfikował", visible: true, width: 150 },
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
  };

  const updateStats = (data) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    setStats({
      total: data.length,
      noAction: data.filter((s) => s.progress === "BRAK AKCJI").length,
      offerSent: data.filter((s) => s.progress === "OFERTA WYSŁANA").length,
      inContact: data.filter((s) => s.progress === "W KONTAKCIE").length,
      updatedToday: data.filter((s) => {
        if (!s.lastUpdated) return false;
        const updateDate = s.lastUpdated.toDate();
        updateDate.setHours(0, 0, 0, 0);
        return updateDate.getTime() === today.getTime();
      }).length,
    });
  };

  // Оптимизированная проверка уведомлений
  const checkForNotifications = useCallback((data) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newNotifications = data
      .filter((school) => {
        if (
          school.lastUpdated &&
          school.lastUpdated.toDate() < sevenDaysAgo &&
          school.progress !== "OFERTA WYSŁANA"
        ) {
          return true;
        }
        return false;
      })
      .map((school) => ({
        id: school.id,
        type: "warning",
        message: `Szkoła "${
          school.name
        }" nie była aktualizowana od ${Math.floor(
          (new Date() - school.lastUpdated.toDate()) / (1000 * 60 * 60 * 24)
        )} dni`,
        school: school,
        date: new Date(),
      }));

    setNotifications(newNotifications.slice(0, 10)); // Ограничиваем количество уведомлений
  }, []);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const handleUpdate = async (id, field, value) => {
    setLoading(true);
    try {
      const schoolRef = doc(db, "schools", id);
      await updateDoc(schoolRef, {
        [field]: value,
        lastUpdated: serverTimestamp(),
        lastUpdatedBy: userData?.name || currentUser?.email,
      });

      setSnackbar({
        open: true,
        message: "Zmiany zostały zapisane!",
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

  // Debounce для поиска
  const debouncedSearch = useMemo(
    () =>
      debounce((value) => {
        setSearchTerm(value);
      }, 300),
    []
  );

  const handleSearchChange = (e) => {
    debouncedSearch(e.target.value);
  };

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

      setSnackbar({
        open: true,
        message: "Szkoła została dodana!",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Błąd podczas dodawania!",
        severity: "error",
      });
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
      setSnackbar({
        open: true,
        message: "Szkoła została zaktualizowana!",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Błąd podczas aktualizacji!",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchool = async (id, name) => {
    if (window.confirm(`Czy na pewno chcesz usunąć szkołę "${name}"?`)) {
      setLoading(true);
      try {
        await deleteDoc(doc(db, "schools", id));
        setSnackbar({
          open: true,
          message: "Szkoła została usunięta!",
          severity: "success",
        });
      } catch (error) {
        setSnackbar({
          open: true,
          message: "Błąd podczas usuwania!",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const viewHistory = async (schoolId) => {
    setLoading(true);
    try {
      const historyQuery = query(
        collection(db, "actions_log"),
        orderBy("timestamp", "desc"),
        limit(50) // Ограничиваем историю 50 записями
      );

      const unsubscribe = onSnapshot(historyQuery, (snapshot) => {
        const history = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.schoolId === schoolId) {
            history.push({ id: doc.id, ...data });
          }
        });
        setHistoryData(history.slice(0, 20)); // Показываем только последние 20 записей
        setShowHistory(true);
      });

      return () => unsubscribe();
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Błąd podczas ładowania historii!",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();

      reader.onload = async (event) => {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        setLoading(true);
        let addedCount = 0;

        // Используем batch для массовой вставки
        for (let row of jsonData.slice(0, 100)) {
          // Ограничиваем импорт 100 записями за раз
          await addDoc(collection(db, "schools"), {
            name: row["Nazwa szkoły"] || "",
            email: row["Kolumna1"] || row["Preferowany kontakt"] || "",
            phone: row["Nr telefonu"] || "",
            progress: row["Progres"] || "BRAK AKCJI",
            notes: row["Notatki"] || "",
            actions: row["Akcje dla recepcji "] || "",
            priority: "medium",
            lastUpdated: serverTimestamp(),
            lastUpdatedBy: userData?.name || currentUser?.email,
            createdBy: userData?.name || currentUser?.email,
            createdAt: serverTimestamp(),
          });
          addedCount++;
        }

        setSnackbar({
          open: true,
          message: `Pomyślnie zaimportowano ${addedCount} szkół!`,
          severity: "success",
        });
        setLoading(false);
      };

      reader.readAsArrayBuffer(file);
    }
  };

  const exportToExcel = () => {
    const exportData = filteredSchools.slice(0, 500).map((school) => ({
      // Ограничиваем экспорт 500 записями
      "Nazwa szkoły": school.name,
      Email: school.email,
      Telefon: school.phone,
      Status: school.progress,
      Notatki: school.notes,
      Akcje: school.actions,
      "Ostatnia aktualizacja": formatDate(school.lastUpdated),
      Zmodyfikował: school.lastUpdatedBy,
      "Następna akcja": school.nextAction,
      Priorytet:
        school.priority === "high"
          ? "Wysoki"
          : school.priority === "medium"
          ? "Średni"
          : "Niski",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Szkoły");
    XLSX.writeFile(wb, `szkoly_${new Date().toISOString().split("T")[0]}.xlsx`);

    setSnackbar({
      open: true,
      message: "Eksport zakończony pomyślnie!",
      severity: "success",
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Brak";
    try {
      const date = timestamp.toDate();
      return date.toLocaleString("pl-PL");
    } catch {
      return "Brak";
    }
  };

  // Пагинация
  const paginatedSchools = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    return filteredSchools.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredSchools, page, rowsPerPage]);

  const handlePageChange = (event, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Индикатор загрузки
  if (isInitialLoad && schools.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <>
            {/* Статистика */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={4} md={2.4}>
                <Card>
                  <CardContent sx={{ py: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      Wszystkie
                    </Typography>
                    <Typography variant="h5">{stats.total}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2.4}>
                <Card sx={{ bgcolor: "#ffebee" }}>
                  <CardContent sx={{ py: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      BRAK AKCJI
                    </Typography>
                    <Typography variant="h5" color="error">
                      {stats.noAction}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2.4}>
                <Card sx={{ bgcolor: "#e8f5e9" }}>
                  <CardContent sx={{ py: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      OFERTA
                    </Typography>
                    <Typography variant="h5" color="success.main">
                      {stats.offerSent}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2.4}>
                <Card sx={{ bgcolor: "#e3f2fd" }}>
                  <CardContent sx={{ py: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      KONTAKT
                    </Typography>
                    <Typography variant="h5" color="info.main">
                      {stats.inContact}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4} md={2.4}>
                <Card sx={{ bgcolor: "#fff3e0" }}>
                  <CardContent sx={{ py: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      Dzisiaj
                    </Typography>
                    <Typography variant="h5" color="warning.main">
                      {stats.updatedToday}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Dodawanie szkoły - упрощенная форма */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <form onSubmit={handleAddSchool}>
                <Grid container spacing={1} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Nazwa szkoły"
                      value={newSchool.name}
                      onChange={(e) =>
                        setNewSchool({ ...newSchool, name: e.target.value })
                      }
                      required
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Email"
                      value={newSchool.email}
                      onChange={(e) =>
                        setNewSchool({ ...newSchool, email: e.target.value })
                      }
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField
                      fullWidth
                      label="Telefon"
                      value={newSchool.phone}
                      onChange={(e) =>
                        setNewSchool({ ...newSchool, phone: e.target.value })
                      }
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={newSchool.progress}
                        onChange={(e) =>
                          setNewSchool({
                            ...newSchool,
                            progress: e.target.value,
                          })
                        }
                        label="Status"
                      >
                        <MenuItem value="BRAK AKCJI">BRAK AKCJI</MenuItem>
                        <MenuItem value="OFERTA WYSŁANA">
                          OFERTA WYSŁANA
                        </MenuItem>
                        <MenuItem value="W KONTAKCIE">W KONTAKCIE</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={1}>
                    <Button
                      fullWidth
                      type="submit"
                      variant="contained"
                      disabled={loading}
                      size="small"
                    >
                      Dodaj
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </Paper>

            {/* Filtry */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={5}>
                  <TextField
                    fullWidth
                    label="Szukaj szkoły"
                    variant="outlined"
                    onChange={handleSearchChange}
                    size="small"
                    placeholder="Wpisz nazwę szkoły..."
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={filters.progress || ""}
                      onChange={(e) =>
                        setFilters({ ...filters, progress: e.target.value })
                      }
                      label="Status"
                    >
                      <MenuItem value="">Wszystkie</MenuItem>
                      <MenuItem value="BRAK AKCJI">BRAK AKCJI</MenuItem>
                      <MenuItem value="OFERTA WYSŁANA">OFERTA WYSŁANA</MenuItem>
                      <MenuItem value="W KONTAKCIE">W KONTAKCIE</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Priorytet</InputLabel>
                    <Select
                      value={filters.priority || ""}
                      onChange={(e) =>
                        setFilters({ ...filters, priority: e.target.value })
                      }
                      label="Priorytet"
                    >
                      <MenuItem value="">Wszystkie</MenuItem>
                      <MenuItem value="high">Wysoki</MenuItem>
                      <MenuItem value="medium">Średni</MenuItem>
                      <MenuItem value="low">Niski</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={exportToExcel}
                    startIcon={<DownloadIcon />}
                    size="small"
                  >
                    Eksportuj
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            {/* Таблица */}
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {visibleColumns.map((column) => (
                      <StyledTableCell
                        key={column.id}
                        style={{ width: column.width, padding: "8px" }}
                      >
                        <TableSortLabel
                          active={sortBy === column.id}
                          direction={sortBy === column.id ? sortOrder : "asc"}
                          onClick={() => handleSort(column.id)}
                        >
                          {column.label}
                        </TableSortLabel>
                      </StyledTableCell>
                    ))}
                    <StyledTableCell style={{ padding: "8px" }}>
                      Akcje
                    </StyledTableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedSchools.map((school) => (
                    <TableRow
                      key={school.id}
                      sx={{
                        "&:hover": { backgroundColor: "#f5f5f5" },
                      }}
                    >
                      {visibleColumns.map((column) => {
                        if (column.id === "contact") {
                          return (
                            <TableCell
                              key={column.id}
                              style={{ padding: "8px" }}
                            >
                              <Typography variant="body2">
                                📧 {school.email || "-"}
                              </Typography>
                              <Typography variant="body2">
                                📞 {school.phone || "-"}
                              </Typography>
                            </TableCell>
                          );
                        }

                        if (column.id === "progress") {
                          return (
                            <TableCell
                              key={column.id}
                              style={{ padding: "8px" }}
                            >
                              <Select
                                value={school.progress || "BRAK AKCJI"}
                                onChange={(e) =>
                                  handleUpdate(
                                    school.id,
                                    "progress",
                                    e.target.value
                                  )
                                }
                                size="small"
                                fullWidth
                              >
                                <MenuItem value="BRAK AKCJI">
                                  <Chip
                                    label="BRAK AKCJI"
                                    color="error"
                                    size="small"
                                  />
                                </MenuItem>
                                <MenuItem value="OFERTA WYSŁANA">
                                  <Chip
                                    label="OFERTA WYSŁANA"
                                    color="success"
                                    size="small"
                                  />
                                </MenuItem>
                                <MenuItem value="W KONTAKCIE">
                                  <Chip
                                    label="W KONTAKCIE"
                                    color="info"
                                    size="small"
                                  />
                                </MenuItem>
                              </Select>
                            </TableCell>
                          );
                        }

                        if (column.id === "priority") {
                          return (
                            <TableCell
                              key={column.id}
                              style={{ padding: "8px" }}
                            >
                              <Select
                                value={school.priority || "medium"}
                                onChange={(e) =>
                                  handleUpdate(
                                    school.id,
                                    "priority",
                                    e.target.value
                                  )
                                }
                                size="small"
                                fullWidth
                              >
                                <MenuItem value="high">
                                  <Chip
                                    label="Wysoki"
                                    color="error"
                                    size="small"
                                  />
                                </MenuItem>
                                <MenuItem value="medium">
                                  <Chip
                                    label="Średni"
                                    color="warning"
                                    size="small"
                                  />
                                </MenuItem>
                                <MenuItem value="low">
                                  <Chip
                                    label="Niski"
                                    color="success"
                                    size="small"
                                  />
                                </MenuItem>
                              </Select>
                            </TableCell>
                          );
                        }

                        if (column.id === "notes" || column.id === "actions") {
                          return (
                            <TableCell
                              key={column.id}
                              style={{ padding: "8px" }}
                            >
                              <TextField
                                value={school[column.id] || ""}
                                onChange={(e) =>
                                  handleUpdate(
                                    school.id,
                                    column.id,
                                    e.target.value
                                  )
                                }
                                multiline
                                rows={1}
                                fullWidth
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                          );
                        }

                        if (column.id === "lastUpdated") {
                          return (
                            <TableCell
                              key={column.id}
                              style={{ padding: "8px" }}
                            >
                              <Typography variant="body2">
                                {formatDate(school.lastUpdated)}
                              </Typography>
                              {school.lastUpdatedBy && (
                                <Typography
                                  variant="caption"
                                  color="textSecondary"
                                >
                                  {school.lastUpdatedBy.split(" ")[0]}
                                </Typography>
                              )}
                            </TableCell>
                          );
                        }

                        return (
                          <TableCell key={column.id} style={{ padding: "8px" }}>
                            {school[column.id] || "-"}
                          </TableCell>
                        );
                      })}
                      <TableCell style={{ padding: "8px" }}>
                        <Tooltip title="Edytuj">
                          <IconButton
                            onClick={() => setEditingSchool(school)}
                            color="primary"
                            size="small"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Historia">
                          <IconButton
                            onClick={() => viewHistory(school.id)}
                            color="info"
                            size="small"
                          >
                            <HistoryIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {isAdmin && (
                          <Tooltip title="Usuń">
                            <IconButton
                              onClick={() =>
                                handleDeleteSchool(school.id, school.name)
                              }
                              color="error"
                              size="small"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Пагинация */}
            {filteredSchools.length > rowsPerPage && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                <Pagination
                  count={Math.ceil(filteredSchools.length / rowsPerPage)}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  size="small"
                />
              </Box>
            )}
          </>
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
        return <Notifications notifications={notifications} />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed" sx={{ zIndex: 1201 }}>
        <Toolbar variant="dense">
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ flexGrow: 1, fontSize: "1.1rem" }}
          >
            System Zarządzania Szkołami
          </Typography>

          <Button
            variant="contained"
            component="label"
            startIcon={<UploadIcon />}
            sx={{
              mr: 1,
              backgroundColor: "white",
              color: "primary.main",
              py: 0.5,
              fontSize: "0.75rem",
            }}
            size="small"
          >
            Import
            <input
              type="file"
              hidden
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
            />
          </Button>

          <Tooltip title="Powiadomienia">
            <IconButton
              color="inherit"
              onClick={() => setActiveTab(3)}
              size="small"
            >
              <Badge badgeContent={notifications.length} color="error">
                <NotificationsIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>

          <Typography variant="body2" sx={{ mx: 1, fontSize: "0.75rem" }}>
            {userData?.name?.split(" ")[0] || currentUser?.email?.split("@")[0]}
          </Typography>

          <Tooltip title="Wyloguj">
            <IconButton color="inherit" onClick={logout} size="small">
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
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
            mt: 7,
          },
        }}
      >
        <List dense>
          <ListItem
            button
            onClick={() => setActiveTab(0)}
            selected={activeTab === 0}
          >
            <ListItemIcon>
              <DashboardIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItem>

          {isAdmin && (
            <ListItem
              button
              onClick={() => setActiveTab(1)}
              selected={activeTab === 1}
            >
              <ListItemIcon>
                <PeopleIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Użytkownicy" />
            </ListItem>
          )}

          <ListItem
            button
            onClick={() => setActiveTab(2)}
            selected={activeTab === 2}
          >
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Ustawienia" />
          </ListItem>
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 2, mt: 7 }}>
        {loading && <LinearProgress sx={{ mb: 1 }} />}
        {renderContent()}
      </Box>

      {/* Модальные окна */}
      <Dialog
        open={!!editingSchool}
        onClose={() => setEditingSchool(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edytuj szkołę</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nazwa szkoły"
                value={editingSchool?.name || ""}
                onChange={(e) =>
                  setEditingSchool({ ...editingSchool, name: e.target.value })
                }
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Email"
                value={editingSchool?.email || ""}
                onChange={(e) =>
                  setEditingSchool({ ...editingSchool, email: e.target.value })
                }
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Telefon"
                value={editingSchool?.phone || ""}
                onChange={(e) =>
                  setEditingSchool({ ...editingSchool, phone: e.target.value })
                }
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={editingSchool?.progress || "BRAK AKCJI"}
                  onChange={(e) =>
                    setEditingSchool({
                      ...editingSchool,
                      progress: e.target.value,
                    })
                  }
                  label="Status"
                >
                  <MenuItem value="BRAK AKCJI">BRAK AKCJI</MenuItem>
                  <MenuItem value="OFERTA WYSŁANA">OFERTA WYSŁANA</MenuItem>
                  <MenuItem value="W KONTAKCIE">W KONTAKCIE</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Priorytet</InputLabel>
                <Select
                  value={editingSchool?.priority || "medium"}
                  onChange={(e) =>
                    setEditingSchool({
                      ...editingSchool,
                      priority: e.target.value,
                    })
                  }
                  label="Priorytet"
                >
                  <MenuItem value="high">Wysoki</MenuItem>
                  <MenuItem value="medium">Średni</MenuItem>
                  <MenuItem value="low">Niski</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notatki"
                multiline
                rows={2}
                value={editingSchool?.notes || ""}
                onChange={(e) =>
                  setEditingSchool({ ...editingSchool, notes: e.target.value })
                }
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Akcje dla recepcji"
                multiline
                rows={2}
                value={editingSchool?.actions || ""}
                onChange={(e) =>
                  setEditingSchool({
                    ...editingSchool,
                    actions: e.target.value,
                  })
                }
                size="small"
              />
            </Grid>
            <Grid item xs={8}>
              <TextField
                fullWidth
                label="Następna akcja"
                value={editingSchool?.nextAction || ""}
                onChange={(e) =>
                  setEditingSchool({
                    ...editingSchool,
                    nextAction: e.target.value,
                  })
                }
                size="small"
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="date"
                label="Data"
                value={editingSchool?.nextActionDate || ""}
                onChange={(e) =>
                  setEditingSchool({
                    ...editingSchool,
                    nextActionDate: e.target.value,
                  })
                }
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingSchool(null)}>Anuluj</Button>
          <Button onClick={handleSaveEdit} variant="contained" color="primary">
            Zapisz
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!showHistory}
        onClose={() => setShowHistory(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Historia zmian</DialogTitle>
        <DialogContent>
          {historyData.length === 0 ? (
            <Typography>Brak historii zmian dla tej szkoły</Typography>
          ) : (
            <TableContainer>
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
                  {historyData.map((log, index) => (
                    <TableRow key={index}>
                      <TableCell>{formatDate(log.timestamp)}</TableCell>
                      <TableCell>{log.user}</TableCell>
                      <TableCell>
                        <Chip label={log.action} size="small" />
                      </TableCell>
                      <TableCell>{log.details}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHistory(false)}>Zamknij</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Dashboard;
