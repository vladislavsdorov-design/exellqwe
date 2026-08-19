
import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  Link as RouterLink,
} from "react-router-dom";
import { Box, CircularProgress, Typography, Button, Stack } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { db } from "./firebase";
import { useAuth } from "./contexts/AuthContext";
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { AuthProvider } from "./contexts/AuthContext";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";

const theme = createTheme({
  typography: {
    fontFamily:
      '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, "Noto Sans", sans-serif',
    h1: { fontFamily: '"Montserrat", "Inter", sans-serif' },
    h2: { fontFamily: '"Montserrat", "Inter", sans-serif' },
    h3: { fontFamily: '"Montserrat", "Inter", sans-serif' },
    h4: { fontFamily: '"Montserrat", "Inter", sans-serif' },
    h5: { fontFamily: '"Montserrat", "Inter", sans-serif' },
    h6: { fontFamily: '"Montserrat", "Inter", sans-serif' },
  },
});

function PriorityCommand({ priority }) {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState({
    phase: "running",
    updated: 0,
    total: 0,
    baseLabel: "",
    error: "",
  });

  useEffect(() => {
    if (!currentUser) {
      navigate("/login", { replace: true });
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        const raw = localStorage.getItem("activeFolderId");
        let baseId = null;
        try {
          baseId = raw ? JSON.parse(raw) : null;
        } catch {
          baseId = null;
        }

        const baseLabel = baseId ? "Wybrana baza" : "Baza główna";
        if (!cancelled) {
          setState((s) => ({ ...s, baseLabel }));
        }

        let docsSnap;
        if (baseId) {
          docsSnap = await getDocs(
            query(collection(db, "schools"), where("folderId", "==", baseId))
          );
        } else {
          docsSnap = await getDocs(collection(db, "schools"));
        }

        const docsToUpdate = baseId
          ? docsSnap.docs
          : docsSnap.docs.filter((d) => (d.data().folderId || null) === null);

        if (!cancelled) {
          setState((s) => ({ ...s, total: docsToUpdate.length }));
        }

        const chunkSize = 450;
        let updated = 0;
        const reportProgress = (value) => {
          if (!cancelled) {
            setState((s) => ({ ...s, updated: value }));
          }
        };

        for (let i = 0; i < docsToUpdate.length; i += chunkSize) {
          const batch = writeBatch(db);
          const slice = docsToUpdate.slice(i, i + chunkSize);

          for (const d of slice) {
            batch.update(d.ref, {
              priority,
              lastUpdated: serverTimestamp(),
              lastUpdatedBy: userData?.name || currentUser.email,
            });
          }

          await batch.commit();
          updated += slice.length;
          reportProgress(updated);
        }

        await addDoc(collection(db, "actions_log"), {
          userId: currentUser.uid,
          user: userData?.name || currentUser.email,
          action: "Bulk priority",
          details: `Set priority "${priority}" for ${updated} schools (${baseLabel})`,
          timestamp: serverTimestamp(),
        });

        if (!cancelled) {
          setState((s) => ({ ...s, phase: "done" }));
          setTimeout(() => navigate("/dashboard", { replace: true }), 600);
        }
      } catch (e) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            phase: "error",
            error: e?.message || "Unknown error",
          }));
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [currentUser, currentUser?.email, currentUser?.uid, navigate, priority, userData?.name]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
      }}
    >
      <Box sx={{ width: "min(520px, 100%)", p: 3, bgcolor: "white", borderRadius: 2, border: "1px solid #e0e0e0" }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
          Komenda: priorytet = {priority}
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          {state.baseLabel ? `Baza: ${state.baseLabel}` : "Baza: ..."}
        </Typography>

        {state.phase === "error" ? (
          <Typography variant="body2" color="error">
            Błąd: {state.error}
          </Typography>
        ) : (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <CircularProgress size={22} />
            <Typography variant="body2">
              Zmieniono: {state.updated} / {state.total}
              {state.phase === "done" ? " (gotowe)" : ""}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function CommandsPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [baseInfo, setBaseInfo] = useState({ label: "Baza: ...", id: null });

  useEffect(() => {
    if (!currentUser) {
      navigate("/login", { replace: true });
      return;
    }

    const raw = localStorage.getItem("activeFolderId");
    let baseId = null;
    try {
      baseId = raw ? JSON.parse(raw) : null;
    } catch {
      baseId = null;
    }

    setBaseInfo({
      label: baseId ? `Baza: wybrana (${baseId})` : "Baza: Baza główna",
      id: baseId,
    });
  }, [currentUser, navigate]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
      }}
    >
      <Box
        sx={{
          width: "min(620px, 100%)",
          p: 3,
          bgcolor: "white",
          borderRadius: 2,
          border: "1px solid #e0e0e0",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
          Komendy
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          {baseInfo.label}
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Komendy działają na ostatnio otwartą bazę. Najpierw otwórz bazę w panelu, potem wejdź na link.
        </Typography>

        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mb: 2 }}>
          <Button component={RouterLink} to="/prioretetniski" variant="contained" color="success">
            Priorytet: niski
          </Button>
          <Button component={RouterLink} to="/prioretetsredni" variant="contained" color="warning">
            Priorytet: średni
          </Button>
          <Button component={RouterLink} to="/prioretetwysoki" variant="contained" color="error">
            Priorytet: wysoki
          </Button>
        </Stack>

        <Button component={RouterLink} to="/dashboard" variant="outlined">
          Wróć do panelu
        </Button>
      </Box>
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/prioretetniski" element={<PriorityCommand priority="low" />} />
            <Route path="/prioretetsredni" element={<PriorityCommand priority="medium" />} />
            <Route path="/prioretetwysoki" element={<PriorityCommand priority="high" />} />
            <Route path="/komendy" element={<CommandsPage />} />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

