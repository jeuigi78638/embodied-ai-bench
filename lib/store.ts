// ============================================================
// lib/store.ts — 跨组件实测数据共享（外部 store）
// 对比工作台 / 具身评测 写入「最近一次实测」，
// 选型决策助手的报告自动引用这些实测证据。
// 纯前端模块，不触达服务端。
// ============================================================

"use client";

import { useSyncExternalStore } from "react";

export interface StoreCompareResult {
  text: string;
  status: string;
  error?: string;
}

export interface CompareRecord {
  prompt: string;
  results: Record<string, StoreCompareResult>;
  finishedAt: number;
}

export interface BenchSummaryItem {
  model: string;
  modelName: string;
  avg: number;
  grade: string;
}

export interface BenchRecord {
  summary: BenchSummaryItem[];
  taskCount: number;
  finishedAt: number;
}

export interface ReportStoreState {
  compare: CompareRecord | null;
  bench: BenchRecord | null;
}

let state: ReportStoreState = { compare: null, bench: null };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function setCompareRecord(record: CompareRecord) {
  state = { ...state, compare: record };
  emit();
}

export function setBenchRecord(record: BenchRecord) {
  state = { ...state, bench: record };
  emit();
}

export function getReportStore(): ReportStoreState {
  return state;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** React hook：订阅实测数据变化 */
export function useReportStore(): ReportStoreState {
  return useSyncExternalStore(subscribe, getReportStore, getReportStore);
}
