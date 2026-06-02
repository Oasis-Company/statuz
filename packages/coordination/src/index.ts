import express from "express";
import cors from "cors";
import helmet from "helmet";
import signalsRouter from "./routes/signals";
import synRouter from "./routes/syn";
import { getSignals, getSynRequests } from "./storage";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/v1/signals", signalsRouter);
app.use("/api/v1/syn", synRouter);

// Health Check
app.get("/health", (_, res) => {
  const signals = getSignals();
  const synRequests = getSynRequests();

  res.json({
    success: true,
    service: "statuz-coordination",
    version: "0.1.0",
    status: "running",
    stats: {
      signalsCount: signals.length,
      synCount: synRequests.length
    }
  });
});

app.get("/", (_, res) => {
  res.json({
    success: true,
    service: "statuz-coordination",
    docs: "https://github.com/statuz-protocol/statuz",
    endpoints: {
      signals: {
        create: "POST /api/v1/signals",
        list: "GET /api/v1/signals?projectId=..."
      },
      syn: {
        create: "POST /api/v1/syn/requests",
        list: "GET /api/v1/syn/requests?projectId=...&status=...",
        update: "PATCH /api/v1/syn/requests/:id"
      }
    }
  });
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   Statuz Coordination Pool - MVP Running                  ║
║   http://localhost:${PORT}                                   ║
║                                                            ║
║   Quick Start:                                             ║
║   - GET  /               - API info                        ║
║   - GET  /health         - Health check                    ║
║   - POST /api/v1/signals - Send a signal                   ║
║   - GET  /api/v1/signals - Get signals                     ║
║   - POST /api/v1/syn/requests - Create SYN request         ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});
