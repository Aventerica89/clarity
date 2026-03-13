/**
 * @fileoverview Shared utility functions used across client and server code.
 */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merges Tailwind CSS class names, resolving conflicts via tailwind-merge.
 *
 * @param inputs - Any number of class values (strings, arrays, conditionals).
 * @returns A single deduplicated, conflict-resolved class string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
