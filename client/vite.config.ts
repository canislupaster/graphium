import { defineConfig } from "vite";
import { join } from "path";
import react from "@vitejs/plugin-react";

export default defineConfig(({command})=>({
	resolve: {
		alias: {
			"@": join(import.meta.dirname, "src")
		}
	},
	server: {
		headers: {
			"Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp"
		}
	},
	plugins: [react()],
}));