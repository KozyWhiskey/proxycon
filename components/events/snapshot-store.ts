'use client';
import { createContext } from 'react';

export const SnapshotIdentity = createContext<string | null>(null);
export const snapshotEvent = 'proxycon-snapshot';
export interface SnapshotReceipt { identity: string | null; key: string; at: string; success: boolean }
const receipts = new Map<string, SnapshotReceipt>();
const receiptKey = (identity: string | null, key: string) => JSON.stringify([identity,key]);
export function latestReceipt(identity: string | null, key: string) { return receipts.get(receiptKey(identity,key)); }
export function publishReceipt(receipt: SnapshotReceipt) {
  receipts.set(receiptKey(receipt.identity,receipt.key),receipt);
  window.dispatchEvent(new CustomEvent(snapshotEvent,{detail:receipt}));
}
