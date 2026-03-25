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
  List,
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
  Divider,
  Chip,
  Alert,
  CircularProgress,
  Avatar,
  Badge,
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
      return new Date(b.createdAt.toDate()) - new Date(a.createdAt.toDate());
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
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="h5">Powiadomienia</Typography>
            {unreadCount > 0 && (
              <Chip label={`${unreadCount} nowe`} color="error" size="small" />
            )}
            {highPriorityCount > 0 && (
              <Chip
                icon={<PriorityIcon />}
                label={`${highPriorityCount} wysokiego priorytetu`}
                color="error"
                size="small"
                variant="outlined"
              />
            )}
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            {isAdmin && (
              <Button
                startIcon={<AdminIcon />}
                onClick={() => setShowAdminMessage(true)}
                size="small"
                variant="contained"
                color="primary"
              >
                Wyślij do wszystkich
              </Button>
            )}
            <Button
              startIcon={<DoneIcon />}
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              size="small"
              variant="outlined"
            >
              Oznacz wszystkie
            </Button>
          </Box>
        </Box>

        <Tabs
          value={tabValue}
          onChange={(e, v) => {
            setTabValue(v);
            setFilter(v === 0 ? "all" : v === 1 ? "unread" : "read");
          }}
        >
          <Tab label="Wszystkie" />
          <Tab label={`Nieprzeczytane (${unreadCount})`} />
          <Tab label="Przeczytane" />
        </Tabs>
      </Paper>

      {sortedNotifications.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <NotificationsActiveIcon
            sx={{ fontSize: 48, color: "grey.400", mb: 2 }}
          />
          <Typography variant="h6" color="textSecondary">
            Brak powiadomień
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Tutaj będą pojawiać się wszystkie ważne informacje
          </Typography>
        </Paper>
      ) : (
        <List>
          {sortedNotifications.map((notification) => (
            <Paper
              key={notification.id}
              sx={{
                mb: 1,
                backgroundColor: notification.read
                  ? "white"
                  : getPriorityColor(notification.priority, notification.type),
                opacity: notification.read ? 0.8 : 1,
                borderLeft:
                  notification.priority === "high" && !notification.read
                    ? "4px solid #f44336"
                    : "none",
                transition: "all 0.3s",
                "&:hover": {
                  transform: "translateX(5px)",
                  boxShadow: 2,
                },
              }}
            >
              <ListItem
                secondaryAction={
                  <Box>
                    <Tooltip title="Oznacz jako przeczytane">
                      <IconButton
                        edge="end"
                        onClick={() => markAsRead(notification.id)}
                        disabled={notification.read}
                        size="small"
                      >
                        <DoneIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Usuń">
                      <IconButton
                        edge="end"
                        onClick={() => deleteNotification(notification.id)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
              >
                <ListItemIcon>
                  <Badge
                    color="error"
                    variant="dot"
                    invisible={
                      notification.read || notification.priority !== "high"
                    }
                  >
                    <Avatar
                      sx={{
                        bgcolor:
                          notification.type === "admin_message"
                            ? "#1976d2"
                            : notification.priority === "high"
                            ? "#f44336"
                            : notification.priority === "medium"
                            ? "#ff9800"
                            : "#9e9e9e",
                      }}
                    >
                      {getIcon(notification)}
                    </Avatar>
                  </Badge>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        flexWrap: "wrap",
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: notification.read ? "normal" : "bold",
                        }}
                      >
                        {notification.title}
                      </Typography>
                      {!notification.read && (
                        <Chip label="Nowe" color="error" size="small" />
                      )}
                      {notification.priority === "high" &&
                        !notification.read && (
                          <Chip
                            icon={<PriorityIcon />}
                            label="Wysoki priorytet"
                            color="error"
                            size="small"
                            variant="outlined"
                          />
                        )}
                      {notification.type === "admin_message" && (
                        <Chip
                          icon={<AdminIcon />}
                          label="Od administratora"
                          color="primary"
                          size="small"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        sx={{ mb: 0.5 }}
                      >
                        {notification.message}
                      </Typography>
                      {notification.fromAdmin && (
                        <Typography
                          variant="caption"
                          color="primary"
                          sx={{ display: "block", mb: 0.5 }}
                        >
                          Od: {notification.fromAdmin}
                        </Typography>
                      )}
                      <Typography variant="caption" color="textSecondary">
                        {notification.createdAt?.toDate
                          ? notification.createdAt.toDate().toLocaleString()
                          : new Date(notification.createdAt).toLocaleString()}
                      </Typography>

                      {notification.actions &&
                        notification.actions.length > 0 &&
                        !notification.read && (
                          <Box sx={{ mt: 1 }}>
                            {notification.actions.map((action, idx) => (
                              <Button
                                key={idx}
                                size="small"
                                variant="outlined"
                                onClick={() =>
                                  handleNotificationAction(notification, action)
                                }
                                sx={{ mr: 1, mt: 1 }}
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
        </List>
      )}

      {/* Диалог отправки сообщения от администратора */}
      <Dialog
        open={showAdminMessage}
        onClose={() => setShowAdminMessage(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AdminIcon color="primary" />
            <Typography>Wyślij wiadomość do wszystkich użytkowników</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Treść wiadomości"
              value={adminMessage}
              onChange={(e) => setAdminMessage(e.target.value)}
              placeholder="Wpisz treść wiadomości, która zostanie wysłana do wszystkich użytkowników..."
              variant="outlined"
            />
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Priorytet wiadomości:
              </Typography>
              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  variant={adminPriority === "high" ? "contained" : "outlined"}
                  color="error"
                  onClick={() => setAdminPriority("high")}
                  startIcon={<PriorityIcon />}
                >
                  Wysoki
                </Button>
                <Button
                  variant={
                    adminPriority === "medium" ? "contained" : "outlined"
                  }
                  color="warning"
                  onClick={() => setAdminPriority("medium")}
                >
                  Średni
                </Button>
                <Button
                  variant={adminPriority === "low" ? "contained" : "outlined"}
                  color="info"
                  onClick={() => setAdminPriority("low")}
                >
                  Niski
                </Button>
              </Box>
            </Box>
            <Alert severity="info" sx={{ mt: 2 }}>
              <strong>Informacja:</strong> Wiadomość zostanie wysłana do
              WSZYSTKICH użytkowników systemu.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAdminMessage(false)}>Anuluj</Button>
          <Button
            onClick={sendAdminMessage}
            variant="contained"
            disabled={!adminMessage.trim()}
          >
            Wyślij
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Notifications;
