import React from "react";
import { Paper, Grid, TextField, FormControl, InputLabel, Select, MenuItem, Button } from "@mui/material";
import { Download as DownloadIcon } from "@mui/icons-material";

const FilterBar = React.memo(({ filters, setFilters, setSearchTerm, handleSearchChange, exportToExcel }) => {
  return (
    <Paper
      className="filters-paper"
      elevation={0}
      sx={{ border: "1px solid #e0e0e0" }}
    >
      <Grid container spacing={2} alignItems="center">
        <Grid xs={12} md={4}>
          <TextField
            fullWidth
            label="Szukaj школы"
            variant="outlined"
            onChange={handleSearchChange}
            size="small"
            placeholder="Wpisz nazwę школы..."
            className="search-field"
          />
        </Grid>
        <Grid xs={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.progress || ""}
              onChange={(e) =>
                setFilters({ ...filters, progress: e.target.value })
              }
              label="Status"
            >
              <MenuItem value="">Wszystkie statusy</MenuItem>
              <MenuItem value="BRAK AKCJI">BRAK AKCJI</MenuItem>
              <MenuItem value="OFERTA WYSŁANA">OFERTA WYSŁANA</MenuItem>
              <MenuItem value="W KONTAKCIE">W KONTAKCIE</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid xs={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Priorytet</InputLabel>
            <Select
              value={filters.priority || ""}
              onChange={(e) =>
                setFilters({ ...filters, priority: e.target.value })
              }
              label="Priorytet"
            >
              <MenuItem value="">Wszystkie priorytety</MenuItem>
              <MenuItem value="high">Wysoki</MenuItem>
              <MenuItem value="medium">Średni</MenuItem>
              <MenuItem value="low">Niski</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid xs={12} md={2}>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => {
              setFilters({ progress: "", priority: "" });
              setSearchTerm("");
            }}
            size="small"
            sx={{ height: "40px" }}
          >
            Wyczyść filtry
          </Button>
        </Grid>
        <Grid xs={12} md={2}>
          <Button
            fullWidth
            variant="contained"
            onClick={exportToExcel}
            startIcon={<DownloadIcon />}
            color="success"
            sx={{ height: "40px" }}
          >
            Eksportuj Excel
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
});

export default FilterBar;
