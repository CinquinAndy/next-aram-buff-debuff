'use client'

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ChevronDown, SortAsc, SortDesc } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SORT_OPTIONS } from '@/app/lib/types'
import { useEffect, useState } from 'react'

export const SortDropdown = ({
	sortBy,
	sortDirection,
	onSort,
	onToggleDirection,
}: {
	sortBy: string
	sortDirection: 'asc' | 'desc'
	onSort: (value: string) => void
	onToggleDirection: () => void
}) => {
	const [isSortAsc, setIsSortAsc] = useState(true)

	useEffect(() => {
		setIsSortAsc(sortDirection === 'asc')
	}, [sortDirection])

	return (
		<div className="flex gap-2">
			<Button
				variant="outline"
				size="icon"
				onClick={onToggleDirection}
				className="h-9 w-9"
			>
				{isSortAsc ? (
					<SortAsc className={'h-4 w-4'} />
				) : (
					<SortDesc className={'h-4 w-4'} />
				)}
			</Button>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="outline"
						className="w-full justify-between sm:w-[200px]"
					>
						<span className="flex items-center gap-2">
							{SORT_OPTIONS.find(option => option.value === sortBy)?.label}
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
	)
}
