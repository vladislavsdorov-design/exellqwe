import React from "react";
import { Grid, Card, CardContent, Typography } from "@mui/material";

const StatCards = React.memo(({ stats }) => {
  return (
    <Grid container spacing={2} className="stats-grid">
      <Grid item xs={6} sm={4} md={2.4}>
        <Card className="stats-card">
          <CardContent sx={{ py: 1.5 }}>
            <Typography
              variant="overline"
              color="textSecondary"
              sx={{ lineHeight: 1 }}
            >
              Wszystkie szkoły
            </Typography>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, color: "primary.main" }}
            >
              {stats.total}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={6} sm={4} md={2.4}>
        <Card
          className="stats-card"
          sx={{ borderLeft: "4px solid #f44336" }}
        >
          <CardContent sx={{ py: 1.5 }}>
            <Typography
              variant="overline"
              color="textSecondary"
              sx={{ lineHeight: 1 }}
            >
              BRAK AKCJI
            </Typography>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, color: "error.main" }}
            >
              {stats.noAction}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={6} sm={4} md={2.4}>
        <Card
          className="stats-card"
          sx={{ borderLeft: "4px solid #4caf50" }}
        >
          <CardContent sx={{ py: 1.5 }}>
            <Typography
              variant="overline"
              color="textSecondary"
              sx={{ lineHeight: 1 }}
            >
              OFERTA WYSŁANA
            </Typography>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, color: "success.main" }}
            >
              {stats.offerSent}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={6} sm={4} md={2.4}>
        <Card
          className="stats-card"
          sx={{ borderLeft: "4px solid #2196f3" }}
        >
          <CardContent sx={{ py: 1.5 }}>
            <Typography
              variant="overline"
              color="textSecondary"
              sx={{ lineHeight: 1 }}
            >
              W KONTAKCIE
            </Typography>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, color: "info.main" }}
            >
              {stats.inContact}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={4} md={2.4}>
        <Card
          className="stats-card"
          sx={{ borderLeft: "4px solid #ff9800" }}
        >
          <CardContent sx={{ py: 1.5 }}>
            <Typography
              variant="overline"
              color="textSecondary"
              sx={{ lineHeight: 1 }}
            >
              Zaktualizowane dzisiaj
            </Typography>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, color: "warning.main" }}
            >
              {stats.updatedToday}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
});

export default StatCards;
