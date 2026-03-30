import React, { useState, useEffect } from "react";
import {
  TableRow,
  TableCell,
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Chip,
  TextField,
  Tooltip,
  IconButton,
  Badge,
} from "@mui/material";
import {
  Edit as EditIcon,
  History as HistoryIcon,
  Delete as DeleteIcon,
  Chat as ChatIcon,
  NotificationsActive as ReminderIcon,
  DriveFileMove as MoveIcon,
} from "@mui/icons-material";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
} from "firebase/firestore";

const SchoolRow = React.memo(
  ({
    school,
    visibleColumns,
    handleUpdate,
    setEditingSchool,
    viewHistory,
    handleDeleteSchool,
    isAdmin,
    formatDate,
    setChatSchool,
    setReminderSchool,
    setMoveSchoolDialog, // Добавляем пропс
  }) => {
    const [unreadCount, setUnreadCount] = useState(0);
    const [messageCount, setMessageCount] = useState(0);
    const [hasNewMessages, setHasNewMessages] = useState(false);

    useEffect(() => {
      if (!school?.id) return;

      const messagesRef = collection(db, "school_messages");
      const q = query(
        messagesRef,
        where("schoolId", "==", school.id),
        orderBy("createdAt", "desc"),
        limit(50)
      );

      let isMounted = true;
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!isMounted) return;
          const totalCount = snapshot.size;
          setMessageCount(totalCount);
          
          // Получаем время последнего просмотра этого чата из localStorage
          const lastSeenData = JSON.parse(localStorage.getItem("chatLastSeen") || "{}");
          const lastSeenTime = lastSeenData[school.id] || 0;

          const unread = snapshot.docs.filter((doc) => {
            const createdAt = doc.data().createdAt?.toDate()?.getTime() || 0;
            return createdAt > lastSeenTime;
          }).length;

          setUnreadCount(unread);
          setHasNewMessages(unread > 0);
        },
        (error) => {
          if (!isMounted) return;
          if (error.code === "failed-precondition") {
            console.warn("Wymagany индекс для czatu: ", school.name);
          } else {
            console.error("Błąd nasłuchiвания czatu:", error);
          }
        }
      );

      return () => {
        isMounted = false;
        unsubscribe();
      };
    }, [school.id, school.name]); // Уменьшаем количество зависимостей, чтобы слушатель не перезапускался слишком часто

    const handleOpenChat = () => {
      // При открытии чата помечаем все сообщения как прочитанные (сохраняем текущее время)
      const lastSeenData = JSON.parse(localStorage.getItem("chatLastSeen") || "{}");
      lastSeenData[school.id] = Date.now();
      localStorage.setItem("chatLastSeen", JSON.stringify(lastSeenData));
      
      setUnreadCount(0);
      setHasNewMessages(false);
      setChatSchool(school);
    };

    const isReminderActive = () => {
      if (!school.reminderDate || !school.reminderText) return false;
      const now = new Date();
      const rDate = new Date(school.reminderDate);
      return now >= rDate;
    };

    const hasReminder = school.reminderDate && school.reminderText;

    return (
      <TableRow key={school.id} className="table-row-hover fade-in-up">
        {visibleColumns.map((column) => {
          if (column.id === "contact") {
            return (
              <TableCell key={column.id} className="compact-cell">
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    📧 {school.email || "-"}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    📞 {school.phone || "-"}
                  </Typography>
                </Box>
              </TableCell>
            );
          }

          if (column.id === "progress") {
            return (
              <TableCell key={column.id} className="compact-cell">
                <FormControl fullWidth size="small">
                  <Select
                    value={school.progress || "BRAK AKCJI"}
                    onChange={(e) =>
                      handleUpdate(school.id, "progress", e.target.value)
                    }
                    sx={{
                      "& .MuiSelect-select": { py: 0.5 },
                      borderRadius: "20px",
                      bgcolor:
                        school.progress === "OFERTA WYSŁANA"
                          ? "#e8f5e9"
                          : school.progress === "W KONTAKCIE"
                          ? "#e3f2fd"
                          : "#ffebee",
                    }}
                  >
                    <MenuItem value="BRAK AKCJI">
                      <Chip
                        label="BRAK AKCJI"
                        color="error"
                        size="small"
                        className="status-chip"
                      />
                    </MenuItem>
                    <MenuItem value="OFERTA WYSŁANA">
                      <Chip
                        label="OFERTA WYSŁANA"
                        color="success"
                        size="small"
                        className="status-chip"
                      />
                    </MenuItem>
                    <MenuItem value="W KONTAKCIE">
                      <Chip
                        label="W KONTAKCIE"
                        color="info"
                        size="small"
                        className="status-chip"
                      />
                    </MenuItem>
                  </Select>
                </FormControl>
              </TableCell>
            );
          }

          if (column.id === "priority") {
            return (
              <TableCell key={column.id} className="compact-cell">
                <Select
                  value={school.priority || "medium"}
                  onChange={(e) =>
                    handleUpdate(school.id, "priority", e.target.value)
                  }
                  size="small"
                  fullWidth
                  sx={{ "& .MuiSelect-select": { py: 0.5 } }}
                >
                  <MenuItem value="high">
                    <Chip label="Wysoki" color="error" size="small" />
                  </MenuItem>
                  <MenuItem value="medium">
                    <Chip label="Średni" color="warning" size="small" />
                  </MenuItem>
                  <MenuItem value="low">
                    <Chip label="Niski" color="success" size="small" />
                  </MenuItem>
                </Select>
              </TableCell>
            );
          }

          if (column.id === "notes" || column.id === "actions") {
            return (
              <TableCell key={column.id} className="compact-cell">
                <TextField
                  defaultValue={school[column.id] || ""}
                  onBlur={(e) => {
                    if (e.target.value !== (school[column.id] || "")) {
                      handleUpdate(school.id, column.id, e.target.value);
                    }
                  }}
                  multiline
                  rows={1}
                  fullWidth
                  size="small"
                  variant="outlined"
                  sx={{ "& .MuiOutlinedInput-root": { fontSize: "0.875rem" } }}
                />
              </TableCell>
            );
          }

          if (column.id === "lastUpdated") {
            return (
              <TableCell key={column.id} className="compact-cell">
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {formatDate(school.lastUpdated)}
                </Typography>
                {school.lastUpdatedBy && (
                  <Typography variant="caption" color="textSecondary">
                    {school.lastUpdatedBy}
                  </Typography>
                )}
              </TableCell>
            );
          }

          return (
            <TableCell key={column.id} className="compact-cell">
              <Typography variant="body2">
                {school[column.id] || "-"}
              </Typography>
            </TableCell>
          );
        })}
        <TableCell className="compact-cell">
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Tooltip title={messageCount > 0 ? `Czat (${messageCount} wiadomości)` : "Czat"}>
              <IconButton
                onClick={handleOpenChat}
                size="small"
                sx={{
                  color: hasNewMessages ? "#f44336" : messageCount > 0 ? "#1976d2" : "inherit",
                  bgcolor: hasNewMessages ? "rgba(244, 67, 54, 0.08)" : "transparent",
                  "&:hover": {
                    bgcolor: hasNewMessages ? "rgba(244, 67, 54, 0.15)" : "rgba(25, 118, 210, 0.08)",
                  }
                }}
              >
                  <Badge
                    badgeContent={unreadCount > 0 ? unreadCount : null}
                    color="error"
                    sx={{
                    "& .MuiBadge-badge": {
                      fontSize: "0.65rem",
                      height: 18,
                      minWidth: 18,
                      fontWeight: 700,
                      border: "2px solid white",
                    },
                  }}
                >
                  <ChatIcon fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>
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
            <Tooltip title={hasReminder ? "Zmień przypomnienie" : "Dodaj przypomnienie"}>
              <IconButton
                onClick={() => setReminderSchool(school)}
                size="small"
                sx={{
                  color: isReminderActive() ? "#fbc02d" : hasReminder ? "#1976d2" : "inherit",
                  animation: isReminderActive() ? "glow 1.5s infinite" : "none",
                  "@keyframes glow": {
                    "0%": { filter: "drop-shadow(0 0 2px #fbc02d)" },
                    "50%": { filter: "drop-shadow(0 0 8px #fbc02d)" },
                    "100%": { filter: "drop-shadow(0 0 2px #fbc02d)" },
                  }
                }}
              >
                <ReminderIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Przenieś do folderu">
              <IconButton
                onClick={() => setMoveSchoolDialog(school)}
                size="small"
                color="primary"
              >
                <MoveIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Usuń">
              <IconButton
                onClick={() => handleDeleteSchool(school.id, school.name)}
                color="error"
                size="small"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </TableCell>
      </TableRow>
    );
  }
);

export default SchoolRow;
