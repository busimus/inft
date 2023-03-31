import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import nodePolyfills from "vite-plugin-node-stdlib-browser";
// import GlobalsPolyfills from "@esbuild-plugins/node-globals-polyfill";
import legacy from "@vitejs/plugin-legacy";
import vue2 from "@vitejs/plugin-vue2";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue2(),
    legacy({
      targets: ["ie >= 11"],
      additionalLegacyPolyfills: ["regenerator-runtime/runtime"],
    }),
    nodePolyfills(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      crypto: "crypto-browserify",
      stream: "stream-browserify",
    },
  },
  define: {
    "process.env": {},
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: "globalThis",
      },
      // Enable esbuild polyfill plugins
      // plugins: [
      //   GlobalsPolyfills({
      //     process: true,
      //     buffer: true,
      //   }),
      // ],
    },
  },
});
