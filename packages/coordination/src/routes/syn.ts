import express from "express";
import { CreateSynInput, SynStatus, UpdateSynInput } from "../types";
import { getSynRequests, saveSynRequest, updateSynRequest } from "../storage";

const router = express.Router();

// 创建 SYN 请求
router.post("/requests", (req, res) => {
  const input: CreateSynInput = req.body;

  if (!input.title || !input.projectId) {
    res.status(400).json({
      success: false,
      error: "Missing required fields: title, projectId"
    });
    return;
  }

  const request = {
    id: `syn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...input,
    status: SynStatus.PENDING,
    createdAt: new Date().toISOString()
  };

  saveSynRequest(request);
  console.log("[SYNQueue] New request:", request.title);

  res.json({ success: true, request });
});

// 获取 SYN 请求列表
router.get("/requests", (req, res) => {
  const projectId = req.query.projectId as string;
  const status = req.query.status as string;

  let requests = getSynRequests(projectId);

  if (status) {
    requests = requests.filter((r) => r.status === status);
  }

  res.json({
    success: true,
    count: requests.length,
    requests
  });
});

// 更新 SYN 请求状态
router.patch("/requests/:id", (req, res) => {
  const { id } = req.params;
  const input: UpdateSynInput = req.body;

  const updated = updateSynRequest(id, input.status, input.resolver);

  if (!updated) {
    res.status(404).json({
      success: false,
      error: "SYN request not found"
    });
    return;
  }

  console.log("[SYNQueue] Updated request:", id, "status:", input.status);

  res.json({ success: true, request: updated });
});

export default router;
