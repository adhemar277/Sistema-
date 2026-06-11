-- Script para persistir alertas

CREATE TABLE IF NOT EXISTS public.alerts (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.alerts DISABLE ROW LEVEL SECURITY;
