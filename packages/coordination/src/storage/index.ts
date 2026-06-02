import { Signal, SynRequest, SynStatus } from "../types";
import fs from "fs";
import path from "path";

// 简单文件存储（SQLite 可选，先从文件开始）
const DATA_DIR = path.join(process.cwd(), "data");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Signal Storage
const SIGNALS_FILE = path.join(DATA_DIR, "signals.json");

export function getSignals(projectId?: string): Signal[] {
  ensureDataDir();
  if (!fs.existsSync(SIGNALS_FILE)) {
    return [];
  }
  const data = JSON.parse(fs.readFileSync(SIGNALS_FILE, "utf-8"));
  if (projectId) {
    return data.filter((s: Signal) => s.projectId === projectId);
  }
  return data;
}

export function saveSignal(signal: Signal): Signal {
  ensureDataDir();
  const signals = getSignals();
  signals.push(signal);
  fs.writeFileSync(SIGNALS_FILE, JSON.stringify(signals, null, 2));
  return signal;
}

// SYN Storage
const SYN_FILE = path.join(DATA_DIR, "syn-requests.json");

export function getSynRequests(projectId?: string): SynRequest[] {
  ensureDataDir();
  if (!fs.existsSync(SYN_FILE)) {
    return [];
  }
  const data = JSON.parse(fs.readFileSync(SYN_FILE, "utf-8"));
  if (projectId) {
    return data.filter((s: SynRequest) => s.projectId === projectId);
  }
  return data;
}

export function saveSynRequest(request: SynRequest): SynRequest {
  ensureDataDir();
  const requests = getSynRequests();
  requests.push(request);
  fs.writeFileSync(SYN_FILE, JSON.stringify(requests, null, 2));
  return request;
}

export function updateSynRequest(
  id: string,
  status: SynStatus,
  resolver: string
): SynRequest | null {
  const requests = getSynRequests();
  const index = requests.findIndex((r) => r.id === id);
  if (index === -1) {
    return null;
  }
  requests[index] = {
    ...requests[index],
    status,
    resolver,
    resolvedAt: new Date().toISOString()
  };
  fs.writeFileSync(SYN_FILE, JSON.stringify(requests, null, 2));
  return requests[index];
}
