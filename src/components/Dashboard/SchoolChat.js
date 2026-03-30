import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
  Avatar,
  CircularProgress,
} from "@mui/material";
import { Send as SendIcon, Close as CloseIcon } from "@mui/icons-material";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";

const SchoolChat = ({ school, onClose }) => {
  const { currentUser, userData } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!school?.id) return;

    const messagesRef = collection(db, "school_messages");
    const q = query(
      messagesRef,
      where("schoolId", "==", school.id),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setMessages(msgs);
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    });

    return () => unsubscribe();
  }, [school?.id]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    try {
      await addDoc(collection(db, "school_messages"), {
        schoolId: school.id,
        text: newMessage,
        userId: currentUser.uid,
        userName: userData?.name || currentUser.displayName || currentUser.email,
        createdAt: serverTimestamp(),
      });
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        height: "500px",
        display: "flex",
        flexDirection: "column",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
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
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Czat: {school.name}
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2, bgcolor: "#f5f7fa" }}>
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
                      <Avatar sx={{ width: 24, height: 24, fontSize: "0.75rem" }}>
                        {msg.userName?.charAt(0)}
                      </Avatar>
                    )}
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {msg.userName}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      maxWidth: "85%",
                      p: 1.5,
                      borderRadius: isMe ? "12px 12px 0 12px" : "0 12px 12px 12px",
                      bgcolor: isMe ? "primary.main" : "white",
                      color: isMe ? "white" : "text.primary",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
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
                      {msg.createdAt?.toDate()?.toLocaleTimeString([], {
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
        sx={{ p: 1.5, display: "flex", gap: 1, bgcolor: "white" }}
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
          sx={{ bgcolor: "primary.main", color: "white", "&:hover": { bgcolor: "primary.dark" } }}
        >
          <SendIcon fontSize="small" />
        </IconButton>
      </Box>
    </Paper>
  );
};

export default SchoolChat;
