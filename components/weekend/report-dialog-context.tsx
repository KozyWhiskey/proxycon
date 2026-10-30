'use client';
import { createContext } from 'react';
export const ReportDialogContext = createContext<{saved:()=>void;editing:()=>void}|null>(null);
