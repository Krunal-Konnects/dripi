"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

const subscribe = () => () => {};

/** Renders overlays at <body> level so animated (transformed) page wrappers can't clip or offset them. */
export function Portal({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return mounted ? createPortal(children, document.body) : null;
}
