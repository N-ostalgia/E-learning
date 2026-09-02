#!/usr/bin/env node
// test-network.mjs - Diagnose network connectivity issues

import { config } from "dotenv";
config({ path: ".env.local" });

const tests = [
  {
    name: "DNS Resolution - Google",
    fn: async () => {
      const result = await fetch("https://www.google.com", { method: "HEAD" });
      return result.ok ? "✅ OK" : `❌ Status ${result.status}`;
    },
  },
  {
    name: "DNS Resolution - Gemini API",
    fn: async () => {
      const result = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: "test" }] }] }),
          signal: AbortSignal.timeout(5000),
        }
      );
      return `Status: ${result.status}`;
    },
  },
  {
    name: "Gemini API with your key",
    fn: async () => {
      const key = process.env.GEMINI_API_KEY;
      if (!key) return "❌ GEMINI_API_KEY not set";
      const result = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: "test" }] }] }),
          signal: AbortSignal.timeout(10000),
        }
      );
      return result.ok ? "✅ OK" : `❌ Status ${result.status}`;
    },
  },
  {
    name: "R2 Bucket DNS",
    fn: async () => {
      const url = process.env.R2_PUBLIC_URL;
      if (!url) return "❌ R2_PUBLIC_URL not set";
      try {
        const result = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
        return `Status: ${result.status}`;
      } catch (e) {
        return `❌ ${e.message}`;
      }
    },
  },
];

console.log("🔍 Network Connectivity Diagnostic\n");

for (const test of tests) {
  process.stdout.write(`${test.name}... `);
  try {
    const result = await test.fn();
    console.log(result);
  } catch (error) {
    console.log(`❌ ${error.message}`);
  }
}
