
// import React, { useEffect, useState } from "react";
// import {
//   BrowserRouter as Router,
//   Routes,
//   Route,
//   Navigate,
//   useNavigate,
//   Link as RouterLink,
// } from "react-router-dom";
// import { Box, CircularProgress, Typography, Button, Stack } from "@mui/material";
// import CssBaseline from "@mui/material/CssBaseline";
// import { ThemeProvider, createTheme } from "@mui/material/styles";
// import { db } from "./firebase";
// import { useAuth } from "./contexts/AuthContext";
// import {
//   addDoc,
//   collection,
//   getDocs,
//   query,
//   serverTimestamp,
//   where,
//   writeBatch,
// } from "firebase/firestore";
// import { AuthProvider } from "./contexts/AuthContext";
// import Login from "./components/Login";
// import Register from "./components/Register";
// import Dashboard from "./components/Dashboard";

// const theme = createTheme({
//   typography: {
//     fontFamily:
//       '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, "Noto Sans", sans-serif',
//     h1: { fontFamily: '"Montserrat", "Inter", sans-serif' },
//     h2: { fontFamily: '"Montserrat", "Inter", sans-serif' },
//     h3: { fontFamily: '"Montserrat", "Inter", sans-serif' },
//     h4: { fontFamily: '"Montserrat", "Inter", sans-serif' },
//     h5: { fontFamily: '"Montserrat", "Inter", sans-serif' },
//     h6: { fontFamily: '"Montserrat", "Inter", sans-serif' },
//   },
// });

// function PriorityCommand({ priority }) {
//   const { currentUser, userData } = useAuth();
//   const navigate = useNavigate();
//   const [state, setState] = useState({
//     phase: "running",
//     updated: 0,
//     total: 0,
//     baseLabel: "",
//     error: "",
//   });

//   useEffect(() => {
//     if (!currentUser) {
//       navigate("/login", { replace: true });
//       return;
//     }

//     let cancelled = false;

//     const run = async () => {
//       try {
//         const raw = localStorage.getItem("activeFolderId");
//         let baseId = null;
//         try {
//           baseId = raw ? JSON.parse(raw) : null;
//         } catch {
//           baseId = null;
//         }

//         const baseLabel = baseId ? "Wybrana baza" : "Baza główna";
//         if (!cancelled) {
//           setState((s) => ({ ...s, baseLabel }));
//         }

//         let docsSnap;
//         if (baseId) {
//           docsSnap = await getDocs(
//             query(collection(db, "schools"), where("folderId", "==", baseId))
//           );
//         } else {
//           docsSnap = await getDocs(collection(db, "schools"));
//         }

//         const docsToUpdate = baseId
//           ? docsSnap.docs
//           : docsSnap.docs.filter((d) => (d.data().folderId || null) === null);

//         if (!cancelled) {
//           setState((s) => ({ ...s, total: docsToUpdate.length }));
//         }

//         const chunkSize = 450;
//         let updated = 0;
//         const reportProgress = (value) => {
//           if (!cancelled) {
//             setState((s) => ({ ...s, updated: value }));
//           }
//         };

//         for (let i = 0; i < docsToUpdate.length; i += chunkSize) {
//           const batch = writeBatch(db);
//           const slice = docsToUpdate.slice(i, i + chunkSize);

//           for (const d of slice) {
//             batch.update(d.ref, {
//               priority,
//               lastUpdated: serverTimestamp(),
//               lastUpdatedBy: userData?.name || currentUser.email,
//             });
//           }

//           await batch.commit();
//           updated += slice.length;
//           reportProgress(updated);
//         }

//         await addDoc(collection(db, "actions_log"), {
//           userId: currentUser.uid,
//           user: userData?.name || currentUser.email,
//           action: "Bulk priority",
//           details: `Set priority "${priority}" for ${updated} schools (${baseLabel})`,
//           timestamp: serverTimestamp(),
//         });

//         if (!cancelled) {
//           setState((s) => ({ ...s, phase: "done" }));
//           setTimeout(() => navigate("/dashboard", { replace: true }), 600);
//         }
//       } catch (e) {
//         if (!cancelled) {
//           setState((s) => ({
//             ...s,
//             phase: "error",
//             error: e?.message || "Unknown error",
//           }));
//         }
//       }
//     };

//     run();

//     return () => {
//       cancelled = true;
//     };
//   }, [currentUser, currentUser?.email, currentUser?.uid, navigate, priority, userData?.name]);

//   return (
//     <Box
//       sx={{
//         minHeight: "100vh",
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         px: 2,
//       }}
//     >
//       <Box sx={{ width: "min(520px, 100%)", p: 3, bgcolor: "white", borderRadius: 2, border: "1px solid #e0e0e0" }}>
//         <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
//           Komenda: priorytet = {priority}
//         </Typography>
//         <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
//           {state.baseLabel ? `Baza: ${state.baseLabel}` : "Baza: ..."}
//         </Typography>

//         {state.phase === "error" ? (
//           <Typography variant="body2" color="error">
//             Błąd: {state.error}
//           </Typography>
//         ) : (
//           <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
//             <CircularProgress size={22} />
//             <Typography variant="body2">
//               Zmieniono: {state.updated} / {state.total}
//               {state.phase === "done" ? " (gotowe)" : ""}
//             </Typography>
//           </Box>
//         )}
//       </Box>
//     </Box>
//   );
// }

// function CommandsPage() {
//   const { currentUser } = useAuth();
//   const navigate = useNavigate();
//   const [baseInfo, setBaseInfo] = useState({ label: "Baza: ...", id: null });

//   useEffect(() => {
//     if (!currentUser) {
//       navigate("/login", { replace: true });
//       return;
//     }

//     const raw = localStorage.getItem("activeFolderId");
//     let baseId = null;
//     try {
//       baseId = raw ? JSON.parse(raw) : null;
//     } catch {
//       baseId = null;
//     }

//     setBaseInfo({
//       label: baseId ? `Baza: wybrana (${baseId})` : "Baza: Baza główna",
//       id: baseId,
//     });
//   }, [currentUser, navigate]);

//   return (
//     <Box
//       sx={{
//         minHeight: "100vh",
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         px: 2,
//       }}
//     >
//       <Box
//         sx={{
//           width: "min(620px, 100%)",
//           p: 3,
//           bgcolor: "white",
//           borderRadius: 2,
//           border: "1px solid #e0e0e0",
//         }}
//       >
//         <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
//           Komendy
//         </Typography>
//         <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
//           {baseInfo.label}
//         </Typography>
//         <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
//           Komendy działają na ostatnio otwartą bazę. Najpierw otwórz bazę w panelu, potem wejdź na link.
//         </Typography>

//         <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mb: 2 }}>
//           <Button component={RouterLink} to="/prioretetniski" variant="contained" color="success">
//             Priorytet: niski
//           </Button>
//           <Button component={RouterLink} to="/prioretetsredni" variant="contained" color="warning">
//             Priorytet: średni
//           </Button>
//           <Button component={RouterLink} to="/prioretetwysoki" variant="contained" color="error">
//             Priorytet: wysoki
//           </Button>
//         </Stack>

//         <Button component={RouterLink} to="/dashboard" variant="outlined">
//           Wróć do panelu
//         </Button>
//       </Box>
//     </Box>
//   );
// }

// function App() {
//   return (
//     <ThemeProvider theme={theme}>
//       <CssBaseline />
//       <AuthProvider>
//         <Router>
//           <Routes>
//             <Route path="/login" element={<Login />} />
//             <Route path="/register" element={<Register />} />
//             <Route path="/dashboard" element={<Dashboard />} />
//             <Route path="/prioretetniski" element={<PriorityCommand priority="low" />} />
//             <Route path="/prioretetsredni" element={<PriorityCommand priority="medium" />} />
//             <Route path="/prioretetwysoki" element={<PriorityCommand priority="high" />} />
//             <Route path="/komendy" element={<CommandsPage />} />
//             <Route path="/" element={<Navigate to="/dashboard" />} />
//           </Routes>
//         </Router>
//       </AuthProvider>
//     </ThemeProvider>
//   );
// }

// export default App;
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

// ============ УВЕДОМЛЕНИЕ ОБ ОПЛАТЕ ============
const PaymentNotification = () => {
  const [pos1, setPos1] = useState({ x: 50, y: 50 });
  const [pos2, setPos2] = useState({ x: 300, y: 100 });
  const [pos3, setPos3] = useState({ x: 150, y: 300 });
  const [vel1, setVel1] = useState({ x: 2.8, y: 2.3 });
  const [vel2, setVel2] = useState({ x: -2.5, y: 3.1 });
  const [vel3, setVel3] = useState({ x: 3.2, y: -2.7 });
  // Убираем setShow т.к. он не используется
  const [flash, setFlash] = useState(false);
  const [screenColor, setScreenColor] = useState({ r: 0, g: 0, b: 0, a: 0 });
  const [colorPhase, setColorPhase] = useState('idle');
  const [size1, setSize1] = useState(200);
  const [size2, setSize2] = useState(200);
  const [size3, setSize3] = useState(200);
  const MAX_SIZE = 400;
  const GROWTH_RATE = 0.15;

  // Мигание красным для квадратов
  useEffect(() => {
    const interval = setInterval(() => {
      setFlash(f => !f);
    }, 300);
    return () => clearInterval(interval);
  }, []);

  // Увеличение квадратов
  useEffect(() => {
    const growInterval = setInterval(() => {
      setSize1(prev => Math.min(prev + GROWTH_RATE, MAX_SIZE));
      setSize2(prev => Math.min(prev + GROWTH_RATE, MAX_SIZE));
      setSize3(prev => Math.min(prev + GROWTH_RATE, MAX_SIZE));
    }, 50);
    return () => clearInterval(growInterval);
  }, []);

  // Постепенное изменение цвета экрана
  useEffect(() => {
    let colorInterval;
    let phaseTimeout;
    let startTime;
    const DURATION = 8000;

    const updateColor = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / DURATION, 1);

      if (colorPhase === 'red') {
        const alpha = progress * 0.4;
        setScreenColor({ r: 255, g: 0, b: 0, a: alpha });
        if (progress >= 1) {
          setColorPhase('blue');
          startTime = Date.now();
        }
      } else if (colorPhase === 'blue') {
        const alpha = progress * 0.4;
        setScreenColor({ r: 0, g: 0, b: 255, a: alpha });
        if (progress >= 1) {
          setColorPhase('idle');
          let fadeStart = Date.now();
          const fadeInterval = setInterval(() => {
            const fadeProgress = (Date.now() - fadeStart) / 1000;
            if (fadeProgress >= 1) {
              setScreenColor({ r: 0, g: 0, b: 0, a: 0 });
              clearInterval(fadeInterval);
            } else {
              const alpha = 0.4 * (1 - fadeProgress);
              setScreenColor({ r: 0, g: 0, b: 255, a: alpha });
            }
          }, 50);
          phaseTimeout = setTimeout(() => {
            setColorPhase('red');
            startTime = Date.now();
          }, 40000);
        }
      }
    };

    if (colorPhase !== 'idle') {
      colorInterval = setInterval(updateColor, 50);
    }

    const initialTimeout = setTimeout(() => {
      setColorPhase('red');
      startTime = Date.now();
    }, 40000);

    return () => {
      clearInterval(colorInterval);
      clearTimeout(phaseTimeout);
      clearTimeout(initialTimeout);
    };
  }, [colorPhase]);

  // Анимация для первого квадрата
  useEffect(() => {
    let frame1;
    const move1 = () => {
      setPos1(p => {
        let nx = p.x + vel1.x;
        let ny = p.y + vel1.y;
        const w = window.innerWidth - size1;
        const h = window.innerHeight - size1;
        if (nx <= 0) { setVel1(v => ({...v, x: Math.abs(v.x)})); nx = 0; } 
        else if (nx >= w) { setVel1(v => ({...v, x: -Math.abs(v.x)})); nx = w; }
        if (ny <= 0) { setVel1(v => ({...v, y: Math.abs(v.y)})); ny = 0; } 
        else if (ny >= h) { setVel1(v => ({...v, y: -Math.abs(v.y)})); ny = h; }
        return { x: nx, y: ny };
      });
      frame1 = requestAnimationFrame(move1);
    };
    move1();
    return () => cancelAnimationFrame(frame1);
  }, [vel1, size1]);

  // Анимация для второго квадрата
  useEffect(() => {
    let frame2;
    const move2 = () => {
      setPos2(p => {
        let nx = p.x + vel2.x;
        let ny = p.y + vel2.y;
        const w = window.innerWidth - size2;
        const h = window.innerHeight - size2;
        if (nx <= 0) { setVel2(v => ({...v, x: Math.abs(v.x)})); nx = 0; } 
        else if (nx >= w) { setVel2(v => ({...v, x: -Math.abs(v.x)})); nx = w; }
        if (ny <= 0) { setVel2(v => ({...v, y: Math.abs(v.y)})); ny = 0; } 
        else if (ny >= h) { setVel2(v => ({...v, y: -Math.abs(v.y)})); ny = h; }
        return { x: nx, y: ny };
      });
      frame2 = requestAnimationFrame(move2);
    };
    move2();
    return () => cancelAnimationFrame(frame2);
  }, [vel2, size2]);

  // Анимация для третьего квадрата
  useEffect(() => {
    let frame3;
    const move3 = () => {
      setPos3(p => {
        let nx = p.x + vel3.x;
        let ny = p.y + vel3.y;
        const w = window.innerWidth - size3;
        const h = window.innerHeight - size3;
        if (nx <= 0) { setVel3(v => ({...v, x: Math.abs(v.x)})); nx = 0; } 
        else if (nx >= w) { setVel3(v => ({...v, x: -Math.abs(v.x)})); nx = w; }
        if (ny <= 0) { setVel3(v => ({...v, y: Math.abs(v.y)})); ny = 0; } 
        else if (ny >= h) { setVel3(v => ({...v, y: -Math.abs(v.y)})); ny = h; }
        return { x: nx, y: ny };
      });
      frame3 = requestAnimationFrame(move3);
    };
    move3();
    return () => cancelAnimationFrame(frame3);
  }, [vel3, size3]);

  return (
    <>
      <style>
        {`
          @keyframes blinkRed {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.2; }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-3px); }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
          }
        `}
      </style>

      {/* Постепенное изменение цвета экрана */}
      {screenColor.a > 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9998,
          pointerEvents: 'none',
          backgroundColor: `rgba(${screenColor.r}, ${screenColor.g}, ${screenColor.b}, ${screenColor.a})`,
          transition: 'background-color 0.05s linear'
        }} />
      )}

      {/* Первый квадрат */}
      <div style={{
        position: 'fixed',
        left: pos1.x,
        top: pos1.y,
        zIndex: 9999,
        width: size1,
        height: size1,
        background: 'rgba(10, 10, 10, 0.92)',
        border: `2px solid ${flash ? 'rgba(255, 0, 0, 0.8)' : 'rgba(0, 255, 0, 0.3)'}`,
        borderRadius: '12px',
        boxShadow: flash ? '0 0 30px rgba(255, 0, 0, 0.15), inset 0 0 30px rgba(255, 0, 0, 0.05)' : '0 0 20px rgba(0, 255, 0, 0.08)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease, width 0.05s linear, height 0.05s linear',
        backdropFilter: 'blur(10px)',
        animation: 'float 3s ease-in-out infinite, pulse 2s ease-in-out infinite',
        pointerEvents: 'none'
      }}>
        <div style={{ width: '100%', height: '65%', position: 'relative', overflow: 'hidden' }}>
          <iframe 
            src="https://gifer.com/embed/xw" 
            width="100%" 
            height="100%" 
            style={{ position: 'absolute', top: 0, left: 0, border: 'none', borderRadius: '12px 12px 0 0' }} 
            allowFullScreen
            title="GIF 1"
          />
        </div>
        <div style={{
          color: flash ? '#ff0000' : '#00ff00',
          fontSize: Math.min(size1 / 6, 40),
          fontWeight: '300',
          fontFamily: 'monospace',
          textShadow: flash ? '0 0 30px rgba(255, 0, 0, 0.2)' : '0 0 20px rgba(0, 255, 0, 0.1)',
          animation: 'blinkRed 0.3s infinite',
          padding: '8px 0',
          letterSpacing: '4px',
          width: '100%',
          textAlign: 'center',
          background: 'rgba(0, 0, 0, 0.6)',
          transition: 'color 0.15s ease, font-size 0.05s linear'
        }}>
          300 PLN
        </div>
      </div>

      {/* Второй квадрат */}
      <div style={{
        position: 'fixed',
        left: pos2.x,
        top: pos2.y,
        zIndex: 9999,
        width: size2,
        height: size2,
        background: 'rgba(10, 10, 10, 0.92)',
        border: `2px solid ${flash ? 'rgba(255, 0, 0, 0.8)' : 'rgba(0, 255, 0, 0.3)'}`,
        borderRadius: '12px',
        boxShadow: flash ? '0 0 30px rgba(255, 0, 0, 0.15), inset 0 0 30px rgba(255, 0, 0, 0.05)' : '0 0 20px rgba(0, 255, 0, 0.08)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease, width 0.05s linear, height 0.05s linear',
        backdropFilter: 'blur(10px)',
        animation: 'float 2.5s ease-in-out infinite reverse, pulse 2.5s ease-in-out infinite',
        pointerEvents: 'none'
      }}>
        <div style={{ width: '100%', height: '65%', position: 'relative', overflow: 'hidden' }}>
          <iframe 
            src="https://gifer.com/embed/bfR" 
            width="100%" 
            height="100%" 
            style={{ position: 'absolute', top: 0, left: 0, border: 'none', borderRadius: '12px 12px 0 0' }} 
            allowFullScreen
            title="GIF 2"
          />
        </div>
        <div style={{
          color: flash ? '#ff0000' : '#00ff00',
          fontSize: Math.min(size2 / 6, 40),
          fontWeight: '300',
          fontFamily: 'monospace',
          textShadow: flash ? '0 0 30px rgba(255, 0, 0, 0.2)' : '0 0 20px rgba(0, 255, 0, 0.1)',
          animation: 'blinkRed 0.3s infinite',
          padding: '8px 0',
          letterSpacing: '4px',
          width: '100%',
          textAlign: 'center',
          background: 'rgba(0, 0, 0, 0.6)',
          transition: 'color 0.15s ease, font-size 0.05s linear'
        }}>
          300 PLN
        </div>
      </div>

      {/* Третий квадрат */}
      <div style={{
        position: 'fixed',
        left: pos3.x,
        top: pos3.y,
        zIndex: 9999,
        width: size3,
        height: size3,
        background: 'rgba(10, 10, 10, 0.92)',
        border: `2px solid ${flash ? 'rgba(255, 0, 0, 0.8)' : 'rgba(0, 255, 0, 0.3)'}`,
        borderRadius: '12px',
        boxShadow: flash ? '0 0 30px rgba(255, 0, 0, 0.15), inset 0 0 30px rgba(255, 0, 0, 0.05)' : '0 0 20px rgba(0, 255, 0, 0.08)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease, width 0.05s linear, height 0.05s linear',
        backdropFilter: 'blur(10px)',
        animation: 'float 3.5s ease-in-out infinite 0.5s, pulse 3s ease-in-out infinite 0.5s',
        pointerEvents: 'none'
      }}>
        <div style={{ width: '100%', height: '65%', position: 'relative', overflow: 'hidden' }}>
          <iframe 
            src="https://gifer.com/embed/MXfo" 
            width="100%" 
            height="100%" 
            style={{ position: 'absolute', top: 0, left: 0, border: 'none', borderRadius: '12px 12px 0 0' }} 
            allowFullScreen
            title="GIF 3"
          />
        </div>
        <div style={{
          color: flash ? '#ff0000' : '#00ff00',
          fontSize: Math.min(size3 / 6, 40),
          fontWeight: '300',
          fontFamily: 'monospace',
          textShadow: flash ? '0 0 30px rgba(255, 0, 0, 0.2)' : '0 0 20px rgba(0, 255, 0, 0.1)',
          animation: 'blinkRed 0.3s infinite',
          padding: '8px 0',
          letterSpacing: '4px',
          width: '100%',
          textAlign: 'center',
          background: 'rgba(0, 0, 0, 0.6)',
          transition: 'color 0.15s ease, font-size 0.05s linear'
        }}>
          300 PLN
        </div>
      </div>
    </>
  );
};
// ============================================

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
          {/* Уведомление об оплате - показывается всегда */}
          <PaymentNotification />
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
