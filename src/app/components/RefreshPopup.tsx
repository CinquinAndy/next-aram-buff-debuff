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
	const [isRefreshing, setIsRefreshing] = useState(false)
	const [dataInfo, setDataInfo] = useState<DataInfo | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState<string | null>(null)

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

	const handleRefresh = async () => {
		setIsRefreshing(true)
		setError(null)
		setSuccess(null)

		try {
			const response = await fetch('/api/refresh', {
				method: 'POST',
			})

			const data = await response.json()

			if (response.ok) {
				setSuccess(
					`✅ Data refreshed! ${data.data.championsCount} champions updated to patch ${data.data.patchVersion}`
				)
				checkDataAge()
				// Refresh page after 2 seconds
				setTimeout(() => {
					window.location.reload()
				}, 2000)
			} else {
				setError(data.error || 'Failed to refresh data')
			}
		} catch (error) {
			setError(
				error instanceof Error ? error.message : 'Failed to refresh data'
			)
		} finally {
			setIsRefreshing(false)
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
				className={`fixed bottom-4 right-4 p-3 rounded-full shadow-lg transition-all hover:scale-110 z-50 ${
					isDataOld
						? 'bg-orange-500 hover:bg-orange-600 animate-pulse'
						: 'bg-blue-500 hover:bg-blue-600'
				}`}
				title="Refresh data"
			>
				<RefreshCw className="w-6 h-6 text-white" />
				{isDataOld && (
					<span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
				)}
			</button>
		)
	}

	return (
		<div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 w-96 z-50 animate-in slide-in-from-bottom-5">
			<div className="flex items-start justify-between mb-3">
				<div className="flex items-center gap-2">
					<RefreshCw
						className={`w-5 h-5 ${isDataOld ? 'text-orange-500' : 'text-blue-500'}`}
					/>
					<h3 className="font-semibold text-gray-900">Data Refresh</h3>
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

				<p className="text-sm text-gray-600">
					Click below to fetch the latest ARAM champion data from the League of
					Legends wiki.
				</p>

				{error && (
					<div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-700">
						{error}
					</div>
				)}

				{success && (
					<div className="bg-green-50 border border-green-200 rounded p-2 text-sm text-green-700">
						{success}
					</div>
				)}

				<button
					type="button"
					onClick={handleRefresh}
					disabled={isRefreshing}
					className={`w-full py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
						isRefreshing
							? 'bg-gray-300 cursor-not-allowed'
							: isDataOld
								? 'bg-orange-500 hover:bg-orange-600 text-white'
								: 'bg-blue-500 hover:bg-blue-600 text-white'
					}`}
				>
					<RefreshCw
						className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
					/>
					{isRefreshing ? 'Refreshing...' : 'Refresh Data Now'}
				</button>

				<p className="text-xs text-gray-500 text-center">
					This will scrape the wiki and update PocketBase (~15s)
				</p>
			</div>
		</div>
	)
}
