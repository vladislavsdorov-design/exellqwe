import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db, auth as firebaseAuth } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Chip,
  Alert,
  Box,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Add as AddIcon,
} from "@mui/icons-material";

function UserManagement() {
  const { currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    name: "",
    role: "user",
    password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      const usersCollection = collection(db, "users");
      const usersSnapshot = await getDocs(usersCollection);
      const usersList = [];
      usersSnapshot.forEach((doc) => {
        usersList.push({ id: doc.id, ...doc.data() });
      });
      setUsers(usersList);
    } catch (error) {
      setError("Błąd podczas ładowania użytkowników");
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { role: newRole });
      await loadUsers();
      setSuccess("Rola użytkownika została zmieniona");
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      setError("Błąd podczas zmiany roli");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm("Czy na pewno chcesz usunąć tego użytkownika?")) {
      try {
        await deleteDoc(doc(db, "users", userId));
        await loadUsers();
        setSuccess("Użytkownik został usunięty");
        setTimeout(() => setSuccess(""), 3000);
      } catch (error) {
        setError("Błąd podczas usuwania użytkownika");
        setTimeout(() => setError(""), 3000);
      }
    }
  };

  const handleAddUser = async () => {
    try {
      // Создаем пользователя в Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        firebaseAuth,
        newUser.email,
        newUser.password
      );

      // Добавляем данные в Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        createdAt: new Date(),
        createdBy: currentUser.uid,
      });

      setShowAddDialog(false);
      setNewUser({ email: "", name: "", role: "user", password: "" });
      await loadUsers();
      setSuccess("Użytkownik został dodany");
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      setError("Błąd podczas dodawania użytkownika: " + error.message);
      setTimeout(() => setError(""), 3000);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "admin":
        return "error";
      case "manager":
        return "warning";
      default:
        return "default";
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case "admin":
        return "Administrator";
      case "manager":
        return "Manager";
      default:
        return "Użytkownik";
    }
  };

  if (!isAdmin) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        Nie masz uprawnień do zarządzania użytkownikami.
      </Alert>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" variant="filled" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" variant="filled" sx={{ mb: 2, borderRadius: 2 }}>
          {success}
        </Alert>
      )}

      <Paper className="table-container" elevation={0} sx={{ border: "1px solid #e0e0e0" }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 3,
            borderBottom: "1px solid #e0e0e0"
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Zarządzanie użytkownikami
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowAddDialog(true)}
            sx={{ px: 3 }}
          >
            Dodaj użytkownika
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8f9fa" }}>
                <TableCell sx={{ fontWeight: 700 }}>Imię i nazwisko</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Rola</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Data utworzenia</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Akcje</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="table-row-hover">
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Select
                          value={user.role}
                          onChange={(e) =>
                            handleRoleChange(user.id, e.target.value)
                          }
                          disabled={user.id === currentUser.uid}
                          sx={{ borderRadius: '20px' }}
                        >
                          <MenuItem value="user">Użytkownik</MenuItem>
                          <MenuItem value="manager">Manager</MenuItem>
                          <MenuItem value="admin">Administrator</MenuItem>
                        </Select>
                      </FormControl>
                      <Chip
                        label={getRoleLabel(user.role)}
                        color={getRoleColor(user.role)}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    {user.createdAt?.toDate
                      ? user.createdAt.toDate().toLocaleDateString()
                      : new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {user.id !== currentUser.uid && (
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteUser(user.id)}
                        size="small"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Dodaj nowego użytkownika</DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            label="Imię i nazwisko"
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            margin="normal"
            required
            variant="outlined"
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            margin="normal"
            required
            variant="outlined"
          />
          <TextField
            fullWidth
            label="Hasło"
            type="password"
            value={newUser.password}
            onChange={(e) =>
              setNewUser({ ...newUser, password: e.target.value })
            }
            margin="normal"
            required
            helperText="Minimum 6 znaków"
            variant="outlined"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Rola</InputLabel>
            <Select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              label="Rola"
            >
              <MenuItem value="user">Użytkownik</MenuItem>
              <MenuItem value="manager">Manager</MenuItem>
              <MenuItem value="admin">Administrator</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setShowAddDialog(false)} color="inherit">
            Anuluj
          </Button>
          <Button onClick={handleAddUser} variant="contained" sx={{ px: 4 }}>
            Dodaj
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default UserManagement;
