'use client'

import { ChevronDown, Search, SortAsc } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SORT_OPTIONS } from '@/app/lib/types'

export const Header = ({
	searchTerm,
	onSearch,
	sortBy,
	onSort,
}: {
	searchTerm: string
	onSearch: (term: string) => void
	sortBy: string
	onSort: (sort: string) => void
}) => {
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
						</div>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									className="w-full justify-between sm:w-[200px]"
								>
									<span className="flex items-center gap-2">
										<SortAsc className="h-4 w-4" />
										{
											SORT_OPTIONS.find(option => option.value === sortBy)
												?.label
										}
									</span>
									<ChevronDown className="h-4 w-4 opacity-50" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-[240px]">
								{SORT_OPTIONS.map(option => (
									<DropdownMenuItem
										key={option.value}
										onClick={() => onSort(option.value)}
										className={cn(
											'flex flex-col items-start space-y-1 py-2',
											sortBy === option.value && 'bg-accent'
										)}
									>
										<span className="font-medium">{option.label}</span>
										<span className="text-xs text-muted-foreground">
											{option.description}
										</span>
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
			</div>
		</div>
	)
}
