import express from "express";
import { CreateSignalInput } from "../types";
import { getSignals, saveSignal } from "../storage";

const router = express.Router();

// 发送信号
router.post("/", (req, res) => {
  const input: CreateSignalInput = req.body;

  if (!input.type || !input.projectId || !input.source) {
    res.status(400).json({
      success: false,
      error: "Missing required fields: type, projectId, source"
    });
    return;
  }

  const signal = {
    id: `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...input,
    receivedAt: new Date().toISOString()
  };

  saveSignal(signal);
  console.log("[SignalHub] Received:", signal.type, "for", signal.projectId);

  res.json({ success: true, signal });
});

// 获取信号列表
router.get("/", (req, res) => {
  const projectId = req.query.projectId as string;
  const signals = getSignals(projectId);

  res.json({
    success: true,
    count: signals.length,
    signals
  });
});

export default router;
