'use client'

import { useState, useEffect } from 'react'
import { X, RefreshCw } from 'lucide-react'

interface DataInfo {
	age: number // in milliseconds
	patchVersion?: string
	lastUpdate?: Date
}

export default function RefreshPopup() {
	const [isOpen, setIsOpen] = useState(false)
	const [dataInfo, setDataInfo] = useState<DataInfo | null>(null)

	const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000

	// Check data age on mount
	useEffect(() => {
		checkDataAge()
		// Auto-open if data is old
		const timer = setTimeout(() => {
			if (dataInfo && dataInfo.age > TWENTY_FOUR_HOURS) {
				setIsOpen(true)
			}
		}, 2000)
		return () => clearTimeout(timer)
	}, [dataInfo?.age])

	const checkDataAge = async () => {
		try {
			const response = await fetch('/api/refresh/info')
			if (response.ok) {
				const info = await response.json()
				setDataInfo(info)
			}
		} catch (error) {
			console.error('Failed to check data age:', error)
		}
	}

	const formatAge = (ms: number): string => {
		const hours = Math.floor(ms / (1000 * 60 * 60))
		if (hours < 24) return `${hours}h ago`
		const days = Math.floor(hours / 24)
		return `${days}d ago`
	}

	const isDataOld = dataInfo && dataInfo.age > TWENTY_FOUR_HOURS

	if (!isOpen) {
		return (
			<button
				type="button"
				onClick={() => setIsOpen(true)}
				className={`fixed bottom-4 left-4 p-3 rounded-full shadow-lg transition-all hover:scale-110 z-50 ${
					isDataOld
						? 'bg-orange-500 hover:bg-orange-600 animate-pulse'
						: 'bg-blue-500 hover:bg-blue-600'
				}`}
				title="Data freshness"
			>
				<RefreshCw className="w-6 h-6 text-white" />
				{isDataOld && (
					<span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
				)}
			</button>
		)
	}

	return (
		<div className="fixed bottom-4 left-4 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 w-96 z-50 animate-in slide-in-from-bottom-5">
			<div className="flex items-start justify-between mb-3">
				<div className="flex items-center gap-2">
					<RefreshCw
						className={`w-5 h-5 ${isDataOld ? 'text-orange-500' : 'text-blue-500'}`}
					/>
					<h3 className="font-semibold text-gray-900">Data freshness</h3>
				</div>
				<button
					type="button"
					onClick={() => setIsOpen(false)}
					className="text-gray-400 hover:text-gray-600 transition-colors"
				>
					<X className="w-5 h-5" />
				</button>
			</div>

			<div className="space-y-3">
				{dataInfo && (
					<div className="text-sm space-y-1">
						<p className="text-gray-600">
							<span className="font-medium">Last update:</span>{' '}
							{formatAge(dataInfo.age)}
						</p>
						{dataInfo.patchVersion && (
							<p className="text-gray-600">
								<span className="font-medium">Patch:</span>{' '}
								{dataInfo.patchVersion}
							</p>
						)}
						{isDataOld && (
							<p className="text-orange-600 font-medium mt-2">
								⚠️ Data is more than 24h old
							</p>
						)}
					</div>
				)}

				{/* No refresh button: POST /api/refresh needs REFRESH_SECRET, which a visitor's browser must not hold */}
				<p className="text-sm text-gray-600">
					The ARAM data from the League of Legends wiki refreshes automatically when it is more than 24h old
					and someone opens the site.
				</p>
			</div>
		</div>
	)
}
