// src/app/services/ImageService.ts

import fs from 'fs'
import path from 'path'
import { HttpService } from './http'

/**
 * Service responsible for managing champion images
 * Handles downloading, caching, and retrieving champion splash art
 */
export class ImageService {
	private static instance: ImageService
	private static readonly IMAGE_DIR = path.join(
		process.cwd(),
		'public/images/champions'
	)
	private static readonly BASE_URL =
		'https://ddragon.leagueoflegends.com/cdn/img/champion/splash'

	/**
	 * Private constructor to enforce singleton pattern
	 * Initializes the image directory structure
	 */
	private constructor() {
		console.info('ImageService: Initializing service')
		this.initImageDirectory()
	}

	/**
	 * Get singleton instance of ImageService
	 */
	public static getInstance(): ImageService {
		if (!ImageService.instance) {
			ImageService.instance = new ImageService()
		}
		return ImageService.instance
	}

	/**
	 * Initialize the directory structure for storing champion images
	 * Creates the directory if it doesn't exist
	 */
	private initImageDirectory(): void {
		try {
			if (!fs.existsSync(ImageService.IMAGE_DIR)) {
				fs.mkdirSync(ImageService.IMAGE_DIR, { recursive: true })
				console.info(
					'ImageService: Image directory created at',
					ImageService.IMAGE_DIR
				)
			}
		} catch (error) {
			console.error('ImageService: Failed to create image directory:', error)
			throw error
		}
	}

	/**
	 * Get the local path for a champion's splash art
	 * @param championName - The name of the champion
	 * @returns The local file path for the champion's splash art
	 */
	private getLocalImagePath(championName: string): string {
		return path.join(ImageService.IMAGE_DIR, `${championName}_splash.jpg`)
	}

	/**
	 * Check if a champion's splash art exists locally
	 * @param championName - The name of the champion
	 * @returns True if the image exists locally, false otherwise
	 */
	private imageExists(championName: string): boolean {
		const imagePath = this.getLocalImagePath(championName)
		return fs.existsSync(imagePath)
	}

	/**
	 * Download and save a champion's splash art
	 * @param championName - The name of the champion
	 * @returns Promise resolving to true if successful, false otherwise
	 */
	private async downloadImage(championName: string): Promise<boolean> {
		const imageUrl = `${ImageService.BASE_URL}/${championName}_0.jpg`
		const localPath = this.getLocalImagePath(championName)

		try {
			console.info(`ImageService: Downloading splash art for ${championName}`)
			console.info(`ImageService: URL: ${imageUrl}`)
			console.info(`ImageService: Local path: ${localPath}`)

			const response = await fetch(imageUrl)

			if (!response.ok) {
				throw new Error(`Failed to fetch image: ${response.status}`)
			}

			const arrayBuffer = await response.arrayBuffer()
			const buffer = Buffer.from(arrayBuffer)

			fs.writeFileSync(localPath, buffer)

			console.info(
				`ImageService: Successfully downloaded splash art for ${championName}`
			)
			return true
		} catch (error) {
			console.error(
				`ImageService: Error downloading splash art for ${championName}:`,
				error
			)
			return false
		}
	}

	/**
	 * Ensure a champion's splash art is available locally
	 * Downloads the image if it doesn't exist
	 * @param championName - The name of the champion
	 * @returns Promise resolving to the local image path
	 */
	public async ensureChampionImage(championName: string): Promise<string> {
		const sanitizedName = championName.replace(/[^a-zA-Z0-9]/g, '')

		if (!this.imageExists(sanitizedName)) {
			console.info(
				`ImageService: Splash art for ${championName} not found locally`
			)
			const success = await this.downloadImage(sanitizedName)

			if (!success) {
				throw new Error(`Failed to download splash art for ${championName}`)
			}
		}

		return `/images/champions/${sanitizedName}_splash.jpg`
	}

	/**
	 * Ensure splash arts are available for multiple champions
	 * @param championNames - Array of champion names
	 * @returns Promise resolving to a map of champion names to image paths
	 */
	public async ensureChampionImages(
		championNames: string[]
	): Promise<Map<string, string>> {
		console.info(
			`ImageService: Ensuring splash arts for ${championNames.length} champions`
		)

		const imagePaths = new Map<string, string>()

		for (const name of championNames) {
			try {
				const path = await this.ensureChampionImage(name)
				imagePaths.set(name, path)
			} catch (error) {
				console.error(
					`ImageService: Failed to ensure splash art for ${name}:`,
					error
				)
			}
		}

		return imagePaths
	}
}
