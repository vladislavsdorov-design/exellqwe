import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  orderBy,
  limit,
  addDoc,
  deleteDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import {
  Paper,
  Typography,
  ListItem,
  ListItemText,
  ListItemIcon,
  Box,
  Button,
  IconButton,
  Tabs,
  Tab,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  CircularProgress,
  Avatar,
  Grid,
} from "@mui/material";
import {
  Warning as WarningIcon,
  Info as InfoIcon,
  Delete as DeleteIcon,
  Done as DoneIcon,
  NotificationsActive as NotificationsActiveIcon,
  Schedule as ScheduleIcon,
  AdminPanelSettings as AdminIcon,
  PriorityHigh as PriorityIcon,
} from "@mui/icons-material";

function Notifications() {
  const { currentUser, userData, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [tabValue, setTabValue] = useState(0);
  const [showAdminMessage, setShowAdminMessage] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [adminPriority, setAdminPriority] = useState("medium");

  // Загрузка уведомлений
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const notificationsRef = collection(db, "notifications");
    const q = query(
      notificationsRef,
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notificationsData = [];
        snapshot.forEach((doc) => {
          notificationsData.push({ id: doc.id, ...doc.data() });
        });
        setNotifications(notificationsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading notifications:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const markAsRead = async (notificationId) => {
    try {
      const notificationRef = doc(db, "notifications", notificationId);
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await deleteDoc(doc(db, "notifications", notificationId));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter((n) => !n.read);
    for (let notification of unreadNotifications) {
      await markAsRead(notification.id);
    }
  };

  // Отправить сообщение от администратора
  const sendAdminMessage = async () => {
    if (!adminMessage.trim()) {
      alert("Proszę wpisać treść wiadomości!");
      return;
    }

    try {
      // Получаем всех пользователей
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);

      if (usersSnapshot.empty) {
        alert("Nie znaleziono użytkowników!");
        return;
      }

      let sentCount = 0;
      let errorCount = 0;

      for (const userDoc of usersSnapshot.docs) {
        try {
          // Отправляем уведомление каждому пользователю
          await addDoc(collection(db, "notifications"), {
            userId: userDoc.id,
            title: "📢 Wiadomość od administratora",
            message: adminMessage,
            type: "admin_message",
            priority: adminPriority,
            createdAt: serverTimestamp(),
            read: false,
            fromAdmin: userData?.name || "Administrator",
            actions: [{ label: "✓ OK", type: "mark_done", icon: "done" }],
          });
          sentCount++;
        } catch (error) {
          console.error(`Error sending to user ${userDoc.id}:`, error);
          errorCount++;
        }
      }

      setAdminMessage("");
      setShowAdminMessage(false);

      if (errorCount === 0) {
        alert(`✅ Wiadomość została wysłana do ${sentCount} użytkowników!`);
      } else {
        alert(
          `⚠️ Wiadomość wysłana do ${sentCount} użytkowników. Błędy: ${errorCount}`
        );
      }
    } catch (error) {
      console.error("Error sending admin message:", error);
      alert("❌ Błąd podczas wysyłania wiadomości: " + error.message);
    }
  };

  const getIcon = (notification) => {
    if (notification.type === "admin_message") {
      return <AdminIcon />;
    }
    if (notification.type === "inactive") {
      return <WarningIcon />;
    }
    if (notification.type === "upcoming_action") {
      return <ScheduleIcon />;
    }
    if (notification.priority === "high") {
      return <PriorityIcon />;
    }
    return <InfoIcon />;
  };

  const getPriorityColor = (priority, type) => {
    if (type === "admin_message") return "#e3f2fd";
    if (priority === "high") return "#ffebee";
    if (priority === "medium") return "#fff3e0";
    if (priority === "low") return "#e8f5e9";
    return "#f5f5f5";
  };

  const handleNotificationAction = async (notification, action) => {
    if (action.type === "mark_done") {
      await markAsRead(notification.id);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "read") return n.read;
    return true;
  });

  // Сортируем по приоритету (высокие вверху)
  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[a.priority] || 1;
    const bPriority = priorityOrder[b.priority] || 1;
    if (aPriority !== bPriority) return aPriority - bPriority;
    if (a.createdAt && b.createdAt) {
      return b.createdAt.toDate() - a.createdAt.toDate();
    }
    return 0;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;
  const highPriorityCount = notifications.filter(
    (n) => n.priority === "high" && !n.read
  ).length;

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Paper className="table-container" elevation={0} sx={{ p: 0, mb: 3, border: "1px solid #e0e0e0" }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 3,
            borderBottom: "1px solid #e0e0e0",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Powiadomienia</Typography>
            {unreadCount > 0 && (
              <Chip label={`${unreadCount} nowe`} color="error" size="small" sx={{ fontWeight: 600 }} />
            )}
            {highPriorityCount > 0 && (
              <Chip
                icon={<PriorityIcon />}
                label={`${highPriorityCount} pilne`}
                color="error"
                size="small"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            )}
          </Box>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            {isAdmin && (
              <Button
                startIcon={<AdminIcon />}
                onClick={() => setShowAdminMessage(true)}
                variant="contained"
                color="primary"
                sx={{ px: 3 }}
              >
                Wyślij do wszystkich
              </Button>
            )}
            <Button
              startIcon={<DoneIcon />}
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              variant="outlined"
              sx={{ px: 3 }}
            >
              Oznacz wszystkie
            </Button>
          </Box>
        </Box>

        <Box sx={{ px: 2 }}>
          <Tabs
            value={tabValue}
            onChange={(e, v) => {
              setTabValue(v);
              setFilter(v === 0 ? "all" : v === 1 ? "unread" : "read");
            }}
            sx={{
              '& .MuiTab-root': { fontWeight: 600, py: 2 },
              '& .Mui-selected': { color: 'primary.main' }
            }}
          >
            <Tab label="Wszystkie" />
            <Tab label={`Nieprzeczytane (${unreadCount})`} />
            <Tab label="Przeczytane" />
          </Tabs>
        </Box>
      </Paper>

      {sortedNotifications.length === 0 ? (
        <Paper elevation={0} sx={{ p: 8, textAlign: "center", border: "1px solid #e0e0e0", borderRadius: 2 }}>
          <NotificationsActiveIcon
            sx={{ fontSize: 64, color: "grey.300", mb: 2 }}
          />
          <Typography variant="h6" color="textSecondary" sx={{ fontWeight: 600 }}>
            Brak powiadomień
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Tutaj будут pojawiać się wszystkie ważne informacje systemowe.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {sortedNotifications.map((notification) => (
            <Paper
              key={notification.id}
              elevation={0}
              sx={{
                p: 0,
                backgroundColor: notification.read
                  ? "white"
                  : getPriorityColor(notification.priority, notification.type),
                border: "1px solid #e0e0e0",
                borderRadius: 2,
                transition: "all 0.2s",
                "&:hover": {
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                  borderColor: "primary.light",
                },
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {!notification.read && (
                <Box
                  sx={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    bgcolor: notification.priority === 'high' ? 'error.main' : 'primary.main'
                  }}
                />
              )}
              <ListItem
                sx={{ py: 2 }}
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Oznacz jako przeczytane">
                      <IconButton
                        onClick={() => markAsRead(notification.id)}
                        disabled={notification.read}
                        size="small"
                        color="primary"
                      >
                        <DoneIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Usuń">
                      <IconButton
                        onClick={() => deleteNotification(notification.id)}
                        size="small"
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
              >
                <ListItemIcon>
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor:
                        notification.type === "admin_message"
                          ? "#1976d2"
                          : notification.priority === "high"
                          ? "#f44336"
                          : notification.priority === "medium"
                          ? "#ff9800"
                          : "#9e9e9e",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                    }}
                  >
                    {getIcon(notification)}
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 0.5
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: notification.read ? 600 : 800,
                          color: notification.read ? "text.primary" : "primary.main"
                        }}
                      >
                        {notification.title}
                      </Typography>
                      {!notification.read && (
                        <Chip label="NOWE" color="primary" size="small" sx={{ height: 20, fontSize: '0.625rem', fontWeight: 700 }} />
                      )}
                      {notification.priority === "high" && !notification.read && (
                        <Chip
                          icon={<PriorityIcon sx={{ fontSize: '1rem !important' }} />}
                          label="PILNE"
                          color="error"
                          size="small"
                          sx={{ height: 20, fontSize: '0.625rem', fontWeight: 700 }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography
                        variant="body2"
                        color="textPrimary"
                        sx={{ mb: 1, fontSize: '0.95rem', lineHeight: 1.5 }}
                      >
                        {notification.message}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        {notification.fromAdmin && (
                          <Typography
                            variant="caption"
                            sx={{ display: "flex", alignItems: 'center', gap: 0.5, fontWeight: 600, color: "primary.main" }}
                          >
                            <AdminIcon sx={{ fontSize: 14 }} /> {notification.fromAdmin}
                          </Typography>
                        )}
                        <Typography variant="caption" sx={{ color: "text.secondary", display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <ScheduleIcon sx={{ fontSize: 14 }} />
                          {notification.createdAt?.toDate
                            ? notification.createdAt.toDate().toLocaleString()
                            : new Date(notification.createdAt).toLocaleString()}
                        </Typography>
                      </Box>

                      {notification.actions &&
                        notification.actions.length > 0 &&
                        !notification.read && (
                          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                            {notification.actions.map((action, idx) => (
                              <Button
                                key={idx}
                                size="small"
                                variant="contained"
                                onClick={() =>
                                  handleNotificationAction(notification, action)
                                }
                                sx={{ borderRadius: 1.5, textTransform: 'none', px: 2 }}
                              >
                                {action.label}
                              </Button>
                            ))}
                          </Box>
                        )}
                    </Box>
                  }
                />
              </ListItem>
            </Paper>
          ))}
        </Box>
      )}

      {/* Диалог отправки сообщения от администратора */}
      <Dialog
        open={showAdminMessage}
        onClose={() => setShowAdminMessage(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ p: 3, pb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <AdminIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Nowa wiadomość systemowa</Typography>
              <Typography variant="body2" color="textSecondary">Wyślij do wszystkich użytkowników</Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Treść wiadomości"
              value={adminMessage}
              onChange={(e) => setAdminMessage(e.target.value)}
              placeholder="Wpisz treść wiadomości..."
              variant="outlined"
              sx={{ bgcolor: '#fcfcfc' }}
            />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                Priorytet wiadomości:
              </Typography>
              <Grid container spacing={1.5}>
                {[
                  { label: "Wysoki", value: "high", color: "error", icon: <PriorityIcon /> },
                  { label: "Średni", value: "medium", color: "warning", icon: null },
                  { label: "Niski", value: "low", color: "info", icon: null }
                ].map((p) => (
                  <Grid xs={4} key={p.value}>
                    <Button
                      fullWidth
                      variant={adminPriority === p.value ? "contained" : "outlined"}
                      color={p.color}
                      onClick={() => setAdminPriority(p.value)}
                      startIcon={p.icon}
                      sx={{ borderRadius: 2, py: 1, textTransform: 'none' }}
                    >
                      {p.label}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button onClick={() => setShowAdminMessage(false)} color="inherit">Anuluj</Button>
          <Button
            onClick={sendAdminMessage}
            variant="contained"
            disabled={!adminMessage.trim()}
            sx={{ px: 4, borderRadius: 2 }}
          >
            Wyślij wiadomość
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Notifications;
