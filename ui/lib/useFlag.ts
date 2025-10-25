"use client";
import flags from "../../flags.json";
export function useFlag(name: keyof typeof flags) {
  return !!(flags as any)[name];
}
