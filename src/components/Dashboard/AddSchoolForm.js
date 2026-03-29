import React from "react";
import { Paper, Typography, Grid, TextField, FormControl, InputLabel, Select, MenuItem, Button } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";

const AddSchoolForm = React.memo(({ newSchool, setNewSchool, handleAddSchool, loading }) => {
  return (
    <Paper className="add-school-form" elevation={0}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Dodaj nową szkołę
      </Typography>
      <form onSubmit={handleAddSchool}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Nazwa szkoły"
              placeholder="Np. Szkoła Podstawowa nr 1"
              value={newSchool.name}
              onChange={(e) =>
                setNewSchool({ ...newSchool, name: e.target.value })
              }
              required
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Email"
              placeholder="kontakt@szkola.pl"
              value={newSchool.email}
              onChange={(e) =>
                setNewSchool({ ...newSchool, email: e.target.value })
              }
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="Telefon"
              placeholder="123 456 789"
              value={newSchool.phone}
              onChange={(e) =>
                setNewSchool({ ...newSchool, phone: e.target.value })
              }
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={newSchool.progress}
                onChange={(e) =>
                  setNewSchool({
                    ...newSchool,
                    progress: e.target.value,
                  })
                }
                label="Status"
              >
                <MenuItem value="BRAK AKCJI">BRAK AKCJI</MenuItem>
                <MenuItem value="OFERTA WYSŁANA">OFERTA WYSŁANA</MenuItem>
                <MenuItem value="W KONTAKCIE">W KONTAKCIE</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              type="submit"
              variant="contained"
              startIcon={<AddIcon />}
              disabled={loading}
              sx={{ height: "40px" }}
            >
              Dodaj szkołę
            </Button>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
});

export default AddSchoolForm;
