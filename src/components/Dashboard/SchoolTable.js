import React from "react";
import { TableContainer, Table, TableHead, TableRow, TableSortLabel, TableBody, Box, Pagination, Typography, TableCell } from "@mui/material";
import { styled } from "@mui/material/styles";
import SchoolRow from "./SchoolRow";

const StyledTableCell = styled((props) => {
  const { className, ...other } = props;
  return <td className={className} {...other} />;
})(({ theme }) => ({
  fontWeight: "bold",
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.common.white,
  padding: '8px',
  textAlign: 'left',
  borderBottom: `1px solid ${theme.palette.divider}`
}));

const SchoolTable = React.memo(({ 
  paginatedSchools, 
  visibleColumns, 
  sortBy, 
  sortOrder, 
  handleSort, 
  handleUpdate, 
  setEditingSchool, 
  viewHistory, 
  handleDeleteSchool, 
  isAdmin, 
  formatDate, 
  page, 
  totalPages, 
  handlePageChange 
}) => {
  return (
    <TableContainer
      className="table-container"
      elevation={0}
      sx={{ border: "1px solid #e0e0e0" }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            {visibleColumns.map((column) => (
              <TableCell
                key={column.id}
                className="styled-table-cell"
                style={{ 
                  width: column.width,
                  backgroundColor: '#1976d2',
                  color: 'white',
                  fontWeight: 'bold'
                }}
              >
                <TableSortLabel
                  active={sortBy === column.id}
                  direction={sortBy === column.id ? sortOrder : "asc"}
                  onClick={() => handleSort(column.id)}
                  sx={{
                    "& .MuiTableSortLabel-icon": {
                      color: "white !important",
                    },
                    "&.Mui-active": { color: "white !important" },
                  }}
                >
                  {column.label}
                </TableSortLabel>
              </TableCell>
            ))}
            <TableCell 
              className="styled-table-cell"
              style={{ 
                backgroundColor: '#1976d2',
                color: 'white',
                fontWeight: 'bold'
              }}
            >
              Akcje
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedSchools.map((school) => (
            <SchoolRow
              key={school.id}
              school={school}
              visibleColumns={visibleColumns}
              handleUpdate={handleUpdate}
              setEditingSchool={setEditingSchool}
              viewHistory={viewHistory}
              handleDeleteSchool={handleDeleteSchool}
              isAdmin={isAdmin}
              formatDate={formatDate}
            />
          ))}
          {paginatedSchools.length === 0 && (
            <TableRow>
              <TableCell colSpan={visibleColumns.length + 1} sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="textSecondary">Nie znaleziono szkół.</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <Box sx={{ p: 2, display: "flex", justifyContent: "center" }}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={handlePageChange}
          color="primary"
          size="medium"
          showFirstButton
          showLastButton
        />
      </Box>
    </TableContainer>
  );
});

export default SchoolTable;
