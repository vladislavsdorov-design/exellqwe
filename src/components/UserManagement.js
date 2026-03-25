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
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from "@mui/icons-material";

function UserManagement() {
  const { currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
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
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h5">Zarządzanie użytkownikami</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowAddDialog(true)}
          >
            Dodaj użytkownika
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Imię i nazwisko</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Rola</TableCell>
                <TableCell>Data utworzenia</TableCell>
                <TableCell>Akcje</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        value={user.role}
                        onChange={(e) =>
                          handleRoleChange(user.id, e.target.value)
                        }
                        disabled={user.id === currentUser.uid}
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
                      sx={{ ml: 1 }}
                    />
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
                      >
                        <DeleteIcon />
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
      >
        <DialogTitle>Dodaj nowego użytkownika</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Imię i nazwisko"
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            margin="normal"
            required
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
          />
          <FormControl fullWidth margin="normal">
            <Select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            >
              <MenuItem value="user">Użytkownik</MenuItem>
              <MenuItem value="manager">Manager</MenuItem>
              <MenuItem value="admin">Administrator</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>Anuluj</Button>
          <Button onClick={handleAddUser} variant="contained">
            Dodaj
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default UserManagement;
