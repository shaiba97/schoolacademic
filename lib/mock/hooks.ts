"use client";

import * as React from "react";
import { getStore, setStore } from "./store";
import type { Student } from "./types";

export function useMockStore() {
  const [store, set] = React.useState(() => getStore());
  React.useEffect(() => {
    set(getStore());
  }, []);
  const update = React.useCallback((patch: Parameters<typeof setStore>[0]) => {
    setStore(patch);
    set(getStore());
  }, []);
  return { store, update, refresh: () => set(getStore()) };
}

export function useStudents() {
  const { store } = useMockStore();
  return store.students;
}
