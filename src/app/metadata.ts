import { Metadata } from 'next'

const siteConfig = {
	name: 'ARAM Balance Checker',
	description:
		'Check all League of Legends ARAM champion balance changes and modifications in real-time',
	url: 'https://aram-balances-checker.forhives.fr',
	ogImage: '/og-image.jpg',
	author: 'Forhives',
	keywords: [
		'League of Legends',
		'LoL',
		'ARAM',
		'Balance',
		'Champions',
		'Buffs',
		'Nerfs',
		'Modifications',
		'Stats',
		'Statistics',
		'Gaming',
		'MOBA',
	],
	themeColor: '#090909',
}

export const baseMetadata: Metadata = {
	metadataBase: new URL(siteConfig.url),
	title: {
		default: siteConfig.name,
		template: `%s | ${siteConfig.name}`,
	},
	description: siteConfig.description,
	keywords: siteConfig.keywords,
	authors: [{ name: siteConfig.author, url: 'https://forhives.fr' }],
	creator: siteConfig.author,
	publisher: siteConfig.author,
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			'max-video-preview': -1,
			'max-image-preview': 'large',
			'max-snippet': -1,
		},
	},
	icons: {
		icon: '/favicon.ico',
		shortcut: '/favicon-16x16.png',
		apple: '/apple-touch-icon.png',
		other: {
			rel: 'apple-touch-icon-precomposed',
			url: '/apple-touch-icon-precomposed.png',
		},
	},
	manifest: '/site.webmanifest',
	openGraph: {
		type: 'website',
		locale: 'en_US',
		alternateLocale: 'fr_FR',
		url: siteConfig.url,
		title: siteConfig.name,
		description: siteConfig.description,
		siteName: siteConfig.name,
		images: [
			{
				url: siteConfig.ogImage,
				width: 1200,
				height: 630,
				alt: 'ARAM Balance Checker - League of Legends Champion Modifications',
			},
		],
	},
	twitter: {
		card: 'summary_large_image',
		title: siteConfig.name,
		description: siteConfig.description,
		images: [siteConfig.ogImage],
		creator: '@forhives',
		site: '@forhives',
	},
	other: {
		'apple-mobile-web-app-capable': 'yes',
		'apple-mobile-web-app-status-bar-style': 'black',
		'apple-mobile-web-app-title': siteConfig.name,
		'mobile-web-app-capable': 'yes',
		'format-detection': 'telephone=no',
	},
}

export function generateMetadata({
	title,
	description,
	image = siteConfig.ogImage,
	noIndex = false,
	alternate = {
		'fr-FR': '/fr',
		'en-US': '/en',
	},
}: {
	title?: string
	description?: string
	image?: string
	noIndex?: boolean
	alternate?: Record<string, string>
}): Metadata {
	return {
		...baseMetadata,
		title: title,
		description: description,
		alternates: {
			languages: alternate,
			canonical: siteConfig.url,
		},
		openGraph: {
			...baseMetadata.openGraph,
			title: title,
			description: description,
			images: [
				{
					url: image,
					width: 1200,
					height: 630,
					alt: title,
				},
			],
		},
		twitter: {
			...baseMetadata.twitter,
			title: title,
			description: description,
			images: [image],
		},
		...(noIndex && {
			robots: {
				index: false,
				follow: false,
			},
		}),
	}
}
