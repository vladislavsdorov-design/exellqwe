import React from "react";
import { TableRow, TableCell, Box, Typography, FormControl, Select, MenuItem, Chip, TextField, Tooltip, IconButton } from "@mui/material";
import { Edit as EditIcon, History as HistoryIcon, Delete as DeleteIcon } from "@mui/icons-material";

const SchoolRow = React.memo(({ school, visibleColumns, handleUpdate, setEditingSchool, viewHistory, handleDeleteSchool, isAdmin, formatDate }) => {
  return (
    <TableRow key={school.id} className="table-row-hover">
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
            <Typography variant="body2">{school[column.id] || "-"}</Typography>
          </TableCell>
        );
      })}
      <TableCell className="compact-cell">
        <Box sx={{ display: "flex", gap: 0.5 }}>
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
          {isAdmin && (
            <Tooltip title="Usuń">
              <IconButton
                onClick={() => handleDeleteSchool(school.id, school.name)}
                color="error"
                size="small"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </TableCell>
    </TableRow>
  );
});

export default SchoolRow;
