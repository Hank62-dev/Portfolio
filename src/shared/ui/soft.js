import { createContext, useContext } from 'react';

/** True inside the workspace, where controls are rounder and softer than on the marketing pages. */
export const SoftContext = createContext(false);
export const useSoft = () => useContext(SoftContext);
