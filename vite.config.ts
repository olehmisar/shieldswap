import { sveltekit } from "@sveltejs/kit/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // @ts-expect-error IDK
  plugins: [sveltekit(), nodePolyfills()],
  build: {
    target: "esnext",
  },
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
    testTimeout: 999999,
    hookTimeout: 999999,
  },
});
