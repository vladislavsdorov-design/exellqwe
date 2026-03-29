import React, { useState } from "react";
import {
  Paper,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  Divider,
  Alert,
  Box,
  Grid,
} from "@mui/material";
import { Save as SaveIcon, Restore as RestoreIcon } from "@mui/icons-material";

function Settings({ columns, setColumns, setVisibleColumns }) {
  const [localColumns, setLocalColumns] = useState(columns);
  const [saveMessage, setSaveMessage] = useState("");

  const handleColumnToggle = (columnId) => {
    setLocalColumns(
      localColumns.map((col) =>
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const handleSaveSettings = () => {
    const visibleIds = localColumns
      .filter((col) => col.visible)
      .map((col) => col.id);
    localStorage.setItem("visibleColumns", JSON.stringify(visibleIds));
    setColumns(localColumns);
    setVisibleColumns(localColumns.filter((col) => col.visible));
    setSaveMessage("Ustawienia zostały zapisane!");
    setTimeout(() => setSaveMessage(""), 3000);
  };

  const handleResetSettings = () => {
    const defaultColumns = localColumns.map((col) => ({
      ...col,
      visible: true,
    }));
    setLocalColumns(defaultColumns);
    const visibleIds = defaultColumns
      .filter((col) => col.visible)
      .map((col) => col.id);
    localStorage.setItem("visibleColumns", JSON.stringify(visibleIds));
    setColumns(defaultColumns);
    setVisibleColumns(defaultColumns.filter((col) => col.visible));
    setSaveMessage("Ustawienia zostały zresetowane!");
    setTimeout(() => setSaveMessage(""), 3000);
  };

  return (
    <Box>
      <Paper className="table-container" elevation={0} sx={{ border: "1px solid #e0e0e0" }}>
        <Box sx={{ p: 3, borderBottom: "1px solid #e0e0e0" }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Ustawienia wyświetlania
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Dostosuj widoczność kolumn w głównej tabeli zarządzania szkołami.
          </Typography>
        </Box>

        <Box sx={{ p: 3 }}>
          {saveMessage && (
            <Alert severity="success" variant="filled" sx={{ mb: 3, borderRadius: 2 }}>
              {saveMessage}
            </Alert>
          )}

          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            Widoczne kolumny:
          </Typography>
          
          <FormGroup>
            <Grid container spacing={1}>
              {localColumns.map((column) => (
                <Grid item xs={12} sm={6} md={4} key={column.id}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1,
                      border: "1px solid",
                      borderColor: column.visible ? "primary.light" : "#eeeeee",
                      bgcolor: column.visible ? "rgba(25, 118, 210, 0.04)" : "transparent",
                      borderRadius: 2,
                      transition: "all 0.2s",
                      "&:hover": { bgcolor: "rgba(25, 118, 210, 0.08)" }
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={column.visible}
                          onChange={() => handleColumnToggle(column.id)}
                          size="small"
                        />
                      }
                      label={
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {column.label}
                        </Typography>
                      }
                      sx={{ width: '100%', m: 0 }}
                    />
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </FormGroup>

          <Divider sx={{ my: 4 }} />

          <Box sx={{ display: "flex", gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<RestoreIcon />}
              onClick={handleResetSettings}
              sx={{ px: 3, borderRadius: 2 }}
            >
              Przywróć domyślne
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveSettings}
              sx={{ px: 4, borderRadius: 2, fontWeight: 600 }}
            >
              Zapisz ustawienia
            </Button>
          </Box>
        </Box>
      </Paper>
      
      <Box sx={{ mt: 3 }}>
        <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
          Zmiany zostaną zapamiętane w Twojej przeglądarce i będą automatycznie stosowane przy każdym logowaniu.
        </Alert>
      </Box>
    </Box>
  );
}

export default Settings;
