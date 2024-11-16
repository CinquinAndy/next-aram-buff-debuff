'use client'

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ChevronDown, SortAsc } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SORT_OPTIONS } from '@/app/lib/types'

/**
 * Enhanced dropdown menu for sorting
 */
export const SortDropdown = ({
	sortBy,
	onSort,
}: {
	sortBy: string
	onSort: (value: string) => void
}) => {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					className="w-full justify-between sm:w-[200px]"
				>
					<span className="flex items-center gap-2">
						<SortAsc className="h-4 w-4" />
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
	)
}
