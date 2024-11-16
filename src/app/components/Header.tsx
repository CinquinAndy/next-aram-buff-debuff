'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

import { SortDropdown } from '@/app/components/SortDropdown'
import { ResetIcon } from '@radix-ui/react-icons'

export const Header = ({
	searchTerm,
	onSearch,
	sortBy,
	onSort,
	onToggleDirection,
	sortDirection,
}: {
	searchTerm: string
	onSearch: (term: string) => void
	sortBy: string
	onSort: (sort: string) => void
	onToggleDirection: () => void
	sortDirection: 'asc' | 'desc'
}) => {
	const reset = () => {
		onSearch('')
		onSort('name')
		sortDirection === 'desc' && onToggleDirection()
	}
	return (
		<div className="sticky top-0 z-50 backdrop-blur-xl">
			<div className="bg-gradient-to-b from-white/80 to-white/40 pb-6 pt-8">
				<div className="mx-auto max-w-7xl px-4">
					<div className="mb-8 flex items-baseline justify-between">
						<div>
							<h1 className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-4xl font-bold text-transparent">
								ARAM Balance Changes
							</h1>
							<p className="mt-2 text-slate-600">
								Current balance modifications for ARAM mode
							</p>
						</div>
					</div>

					<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
							<Input
								type="text"
								placeholder="Search champions..."
								value={searchTerm}
								onChange={e => onSearch(e.target.value)}
								className="w-full pl-10 pr-4"
							/>
							<ResetIcon
								className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 cursor-pointer text-slate-400"
								onClick={reset}
							/>
						</div>

						<SortDropdown
							sortBy={sortBy}
							sortDirection={sortDirection}
							onSort={onSort}
							onToggleDirection={onToggleDirection}
						/>
					</div>
				</div>
			</div>
		</div>
	)
}
