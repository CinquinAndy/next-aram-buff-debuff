import { defineConfig } from 'vitest/config'

// Tauri expects a fixed port and the built files in dist/
export default defineConfig({
	clearScreen: false,
	server: { port: 1420, strictPort: true, watch: { ignored: ['**/src-tauri/**', '**/lcu/**', '**/target/**'] } },
	build: { target: 'es2022', outDir: 'dist', emptyOutDir: true },
	// Inline (empty) PostCSS config: without it Vite searches parent folders and loads the site's
	// postcss.config.mjs, whose Tailwind plugin is not installed here (Windows release build failed on it)
	css: { postcss: {} },
	test: { include: ['tests/**/*.test.ts'], environment: 'node' },
})
