import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  Divider,
  Paper,
  Avatar,
  CircularProgress,
} from "@mui/material";
import {
  Send as SendIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  EventNote as NoteIcon,
  NotificationsActive as NotificationIcon,
} from "@mui/icons-material";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";

const SchoolChat = ({ school, onClose }) => {
  const { currentUser, userData } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [reminderText, setReminderText] = useState(school?.reminderText || "");
  const [reminderDate, setReminderDate] = useState(school?.reminderDate || "");
  const messagesEndRef = useRef(null);

  const scrollToBottom = (behavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  useEffect(() => {
    if (!school?.id) return;

    const messagesRef = collection(db, "school_messages");
    const q = query(
      messagesRef,
      where("schoolId", "==", school.id),
      orderBy("createdAt", "asc")
    );

    let isMounted = true;
    let unsubscribe = null;

    try {
      unsubscribe = onSnapshot(
        q, 
        (snapshot) => {
          if (!isMounted) return;
          
          // Получаем новые сообщения из Firestore
          const serverMsgs = [];
          snapshot.forEach((doc) => {
            serverMsgs.push({ id: doc.id, ...doc.data() });
          });

          // Синхронизируем стейт: убираем оптимистичные сообщения, которые уже пришли с сервера
          setMessages(prev => {
            // Оставляем только те оптимистичные сообщения, которых еще нет на сервере
            const stillOptimistic = prev.filter(p => 
              p.isOptimistic && !serverMsgs.some(s => s.text === p.text && s.userId === p.userId)
            );
            return [...serverMsgs, ...stillOptimistic].sort((a, b) => {
              const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : Date.now();
              const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : Date.now();
              return timeA - timeB;
            });
          });

          setLoading(false);
          setTimeout(() => scrollToBottom("smooth"), 100);
        },
        (error) => {
          if (!isMounted) return;
          console.error("Chat snapshot error:", error);
          if (error.code === "failed-precondition") {
            setLoading(false);
          }
        }
      );
    } catch (err) {
      console.error("Snapshot creation failed:", err);
    }

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [school?.id]);

  // Обновление локальных данных школы (для напоминаний)
  useEffect(() => {
    if (!school?.id) return;
    
    let isMounted = true;
    let unsub = null;

    try {
      const schoolRef = doc(db, "schools", school.id);
      unsub = onSnapshot(
        schoolRef, 
        (doc) => {
          if (!isMounted) return;
          if (doc.exists()) {
            const data = doc.data();
            setReminderText(data.reminderText || "");
            setReminderDate(data.reminderDate || "");
          }
        },
        (error) => {
          if (!isMounted) return;
          console.error("School data snapshot error:", error);
        }
      );
    } catch (err) {
      console.error("School snapshot creation failed:", err);
    }
    
    return () => {
      isMounted = false;
      if (unsub) unsub();
    };
  }, [school.id]);

  // Прокрутка при первом открытии
  useEffect(() => {
    if (!loading) {
      scrollToBottom("auto");
    }
  }, [loading]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    const messageToSend = newMessage;
    setNewMessage(""); // Очищаем сразу для лучшего UX

    try {
      // Оптимистичное обновление: добавляем сообщение в локальный стейт сразу
      const tempId = Date.now().toString();
      const optimisticMessage = {
        id: tempId,
        schoolId: school.id,
        text: messageToSend,
        userId: currentUser.uid,
        userName: userData?.name || currentUser.displayName || currentUser.email,
        createdAt: { toDate: () => new Date() }, // Имитируем метку времени
        isOptimistic: true
      };
      
      setMessages(prev => [...prev, optimisticMessage]);
      setTimeout(() => scrollToBottom("smooth"), 50);

      await addDoc(collection(db, "school_messages"), {
        schoolId: school.id,
        text: messageToSend,
        userId: currentUser.uid,
        userName: userData?.name || currentUser.displayName || currentUser.email,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error sending message:", error);
      setNewMessage(messageToSend); // Возвращаем текст при ошибке
    }
  };

  const isReminderActive = () => {
    if (!reminderDate || !reminderText) return false;
    const now = new Date();
    const rDate = new Date(reminderDate);
    return now >= rDate;
  };

  return (
    <Paper
      elevation={5}
      sx={{
        height: "600px",
        width: "800px",
        display: "flex",
        flexDirection: "row",
        borderRadius: 3,
        overflow: "hidden",
        bgcolor: "#f8f9fa",
      }}
    >
      {/* Левая панель: Информация и Напоминания */}
      <Box
        sx={{
          width: "320px",
          borderRight: "1px solid #e0e0e0",
          display: "flex",
          flexDirection: "column",
          bgcolor: "white",
        }}
      >
        <Box sx={{ p: 2, bgcolor: "#f1f3f4", display: "flex", alignItems: "center", gap: 1 }}>
          <InfoIcon color="primary" fontSize="small" />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Informacje o szkole
          </Typography>
        </Box>
        
        <Box sx={{ p: 2, flexGrow: 1, overflowY: "auto" }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="caption" color="textSecondary" display="block">Nazwa</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>{school.name}</Typography>
            
            <Typography variant="caption" color="textSecondary" display="block">Kontakt</Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>📧 {school.email || "-"}</Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>📞 {school.phone || "-"}</Typography>
            
            <Typography variant="caption" color="textSecondary" display="block">Status</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{school.progress || "-"}</Typography>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <NoteIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Przypomnienie
            </Typography>
          </Box>

          <TextField
            fullWidth
            size="small"
            label="Tekst przypomnienia (podgląd)"
            multiline
            rows={3}
            value={reminderText}
            readOnly
            sx={{ mb: 2, bgcolor: "#f5f5f5" }}
          />

          <TextField
            fullWidth
            size="small"
            label="Data i czas (podgląd)"
            value={reminderDate ? new Date(reminderDate).toLocaleString("pl-PL") : "Brak"}
            readOnly
            sx={{ mb: 2, bgcolor: "#f5f5f5" }}
          />

          <Typography variant="caption" color="textSecondary" sx={{ fontStyle: "italic" }}>
            * Edytuj przypomnienie klikając ikonę dzwonka w tabeli Akcje.
          </Typography>
        </Box>
      </Box>

      {/* Правая панель: Чат */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", bgcolor: "#f5f7fa" }}>
        <Box
          sx={{
            p: 2,
            bgcolor: "primary.main",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Czat: {school.name}
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Активное напоминание сверху */}
        {isReminderActive() && (
          <Box
            sx={{
              p: 1.5,
              bgcolor: "#fff9c4",
              borderBottom: "1px solid #fbc02d",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              animation: "fadeIn 0.5s ease-in-out",
            }}
          >
            <NotificationIcon sx={{ color: "#f57f17" }} />
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "#f57f17", display: "block", textTransform: "uppercase" }}>
                Termin wykonania!
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500, color: "#424242" }}>
                {reminderText}
              </Typography>
            </Box>
          </Box>
        )}

        <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : messages.length === 0 ? (
            <Typography
              variant="body2"
              color="textSecondary"
              sx={{ textAlign: "center", mt: 4 }}
            >
              Brak wiadomości. Napisz coś!
            </Typography>
          ) : (
            <List sx={{ p: 0 }}>
              {messages.map((msg, index) => {
                const isMe = msg.userId === currentUser.uid;
                return (
                  <ListItem
                    key={msg.id || index}
                    sx={{
                      flexDirection: "column",
                      alignItems: isMe ? "flex-end" : "flex-start",
                      p: 0,
                      mb: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 1,
                        mb: 0.5,
                      }}
                    >
                      {!isMe && (
                        <Avatar sx={{ width: 24, height: 24, fontSize: "0.75rem", bgcolor: "secondary.main" }}>
                          {msg.userName?.charAt(0)}
                        </Avatar>
                      )}
                      <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
                        {msg.userName}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        maxWidth: "85%",
                        p: 1.5,
                        borderRadius: isMe ? "16px 16px 0 16px" : "0 16px 16px 16px",
                        bgcolor: isMe ? "primary.main" : "white",
                        color: isMe ? "white" : "text.primary",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                        opacity: msg.isOptimistic ? 0.7 : 1, // Полупрозрачность для отправляемых
                      }}
                    >
                      <Typography variant="body2">{msg.text}</Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          textAlign: "right",
                          mt: 0.5,
                          fontSize: "0.65rem",
                          opacity: 0.8,
                        }}
                      >
                        {msg.isOptimistic ? "Wysyłanie..." : msg.createdAt?.toDate()?.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Typography>
                    </Box>
                  </ListItem>
                );
              })}
              <div ref={messagesEndRef} />
            </List>
          )}
        </Box>

        <Divider />
        <Box
          component="form"
          onSubmit={handleSendMessage}
          sx={{ p: 2, display: "flex", gap: 1, bgcolor: "white" }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Wpisz wiadomość..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 4 } }}
          />
          <IconButton
            type="submit"
            color="primary"
            disabled={!newMessage.trim()}
            sx={{
              bgcolor: "primary.main",
              color: "white",
              "&:hover": { bgcolor: "primary.dark" },
              "&.Mui-disabled": { bgcolor: "#e0e0e0", color: "#9e9e9e" }
            }}
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
};

export default SchoolChat;
