import { defineConfig } from "vite";
import { extname, join } from "path";
import { cp } from "fs/promises";

import tailwindcss from '@tailwindcss/vite';
import preact from '@preact/preset-vite';

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
	plugins: [
		preact(),
		tailwindcss()
	],
}));