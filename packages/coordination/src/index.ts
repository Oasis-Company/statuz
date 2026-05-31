import express from "express";
import cors from "cors";
import helmet from "helmet";

const app = express();
const PORT = 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

// 简单内存存储（Spike 专用，生产使用数据库）
const signals: any[] = [];
const synRequests: any[] = [];

// --- Signal Hub ---

// 接收信号
app.post("/api/v1/signals", (req, res) => {
  const signal = {
    id: `sig_${Date.now()}`,
    ...req.body,
    receivedAt: new Date().toISOString()
  };

  signals.push(signal);
  console.log("[SignalHub] Received:", signal);

  // 简单路由：记录到控制台，后续可以扩展为 Webhook 推送
  console.log("[SignalHub] Routed to:", detectRelevantAgents(signal));

  res.json({ success: true, signal });
});

// 获取信号列表
app.get("/api/v1/signals", (_, res) => {
  res.json({ success: true, signals: signals.slice(-50) });
});

// --- SYN Queue ---

// 创建 SYN 请求
app.post("/api/v1/syn/requests", (req, res) => {
  const request = {
    id: `syn_${Date.now()}`,
    ...req.body,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  synRequests.push(request);
  console.log("[SYNQueue] New request:", request);

  res.json({ success: true, request });
});

// 获取 SYN 队列
app.get("/api/v1/syn/requests", (_, res) => {
  res.json({ success: true, requests: synRequests });
});

// --- Health Check ---

app.get("/health", (_, res) => {
  res.json({
    success: true,
    service: "statuz-coordination",
    status: "spike-running",
    signalsCount: signals.length,
    synCount: synRequests.length
  });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║   Statuz Coordination Pool - Spike Running       ║
║   http://localhost:${PORT}                         ║
║                                                  ║
║   Test endpoints:                                ║
║   - POST /api/v1/signals                         ║
║   - GET  /api/v1/signals                         ║
║   - POST /api/v1/syn/requests                    ║
║   - GET  /api/v1/syn/requests                    ║
╚══════════════════════════════════════════════════╝
  `);
});

// 简单的代理检测逻辑
function detectRelevantAgents(signal: any) {
  // 这是 Spike 版本的简化逻辑
  // 实际版本会查询 niche manifest 来判断相关性
  return ["agent-frontend", "agent-backend"];
}
