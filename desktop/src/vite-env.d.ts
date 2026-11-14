/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** Demo mode only: where to read the champions (default: the production site) */
	readonly VITE_CHAMPIONS_URL?: string
}
