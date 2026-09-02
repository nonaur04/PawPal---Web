import { useSyncExternalStore } from "react";

// Tiny shared store for the mobile navigation drawer.
// Lets TopBar (the hamburger button) and Sidebar (the drawer itself) share
// open/close state without a context provider — so App.jsx and the pages
// don't need to change at all. Pure React, no libraries.
//
// Place this file in src/components/ next to Sidebar.jsx and TopBar.jsx.

let isOpen = false;
const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn());
}

export function openNav() {
  isOpen = true;
  emit();
}

export function closeNav() {
  isOpen = false;
  emit();
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function getSnapshot() {
  return isOpen;
}

export function useMobileNav() {
  return useSyncExternalStore(subscribe, getSnapshot);
}