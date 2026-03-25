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
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Ustawienia kolumn
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Wybierz które kolumny mają być widoczne w tabeli głównej
      </Typography>

      {saveMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {saveMessage}
        </Alert>
      )}

      <FormGroup>
        <Grid container spacing={2}>
          {localColumns.map((column) => (
            <Grid item xs={12} sm={6} md={4} key={column.id}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={column.visible}
                    onChange={() => handleColumnToggle(column.id)}
                  />
                }
                label={column.label}
              />
            </Grid>
          ))}
        </Grid>
      </FormGroup>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: "flex", gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSaveSettings}
        >
          Zapisz ustawienia
        </Button>
        <Button
          variant="outlined"
          startIcon={<RestoreIcon />}
          onClick={handleResetSettings}
        >
          Resetuj
        </Button>
      </Box>
    </Paper>
  );
}

export default Settings;
