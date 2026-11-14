/** Updates from the GitHub Releases (see `plugins.updater` in src-tauri/tauri.conf.json) */

export async function checkForUpdate(banner: HTMLElement): Promise<void> {
	try {
		const { check } = await import('@tauri-apps/plugin-updater')
		const update = await check()
		if (!update) return

		banner.hidden = false
		banner.replaceChildren()
		const text = document.createElement('span')
		text.textContent = `Version ${update.version} is available.`
		const button = document.createElement('button')
		button.textContent = 'Install and restart'
		button.addEventListener('click', async () => {
			button.disabled = true
			button.textContent = 'Downloading…'
			await update.downloadAndInstall()
			const { relaunch } = await import('@tauri-apps/plugin-process')
			await relaunch()
		})
		banner.append(text, button)
	} catch (error) {
		// No network or no release yet: the app works without updates
		console.warn('Update check failed', error)
	}
}
