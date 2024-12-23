import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import Link from 'next/link'

const geistSans = localFont({
	src: './fonts/GeistVF.woff',
	variable: '--font-geist-sans',
	weight: '100 900',
})
const geistMono = localFont({
	src: './fonts/GeistMonoVF.woff',
	variable: '--font-geist-mono',
	weight: '100 900',
})

export const metadata: Metadata = {
	title: 'ARAM Balance Checker',
	description: 'ARAM Balance Checker, to see buffs and nerfs in ARAM',
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				{children}
				<Link
					href={'https://forhives.fr'}
					className={
						'fixed bottom-0 right-0 rounded-tl bg-white/10 p-3 text-xs text-white'
					}
				>
					Developed with ❤️ by{' '}
					<span className={'hover:underline'}>ForHives</span>
				</Link>
			</body>
		</html>
	)
}
