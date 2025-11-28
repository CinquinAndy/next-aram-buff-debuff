'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

import { SortDropdown } from '@/app/components/SortDropdown'
import { ResetIcon } from '@radix-ui/react-icons'
import { ReactNode } from 'react'

export const Header = ({
	searchTerm,
	onSearch,
	sortBy,
	onSort,
	onToggleDirection,
	sortDirection,
	children,
}: {
	searchTerm: string
	onSearch: (term: string) => void
	sortBy: string
	onSort: (sort: string) => void
	onToggleDirection: () => void
	sortDirection: 'asc' | 'desc'
	children?: ReactNode
}) => {
	const reset = () => {
		onSearch('')
		onSort('name')
		sortDirection === 'desc' && onToggleDirection()
	}
	return (
		<div className="sticky top-0 z-50 rounded-b-2xl backdrop-blur-2xl">
			<div className="relative flex w-full items-center rounded-b-2xl bg-gradient-to-b from-black/60 to-black/20 pb-6 pt-6 shadow-2xl shadow-black/10">
				<div className={'w-full'}>
					<div className="mx-auto max-w-7xl px-4">
						{/* Game Mode Selector */}
						{children && (
							<div className="mb-4 border-b border-white/10 pb-4">
								{children}
							</div>
						)}

						<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
							<div className="relative flex-1">
								<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
								<Input
									type="text"
									placeholder="Search champions..."
									value={searchTerm}
									onChange={e => onSearch(e.target.value)}
									className="w-full pl-10 pr-4 text-white"
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
		</div>
	)
}
