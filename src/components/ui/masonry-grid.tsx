// components/ui/masonry-grid.tsx

import * as React from 'react'

import {
	motion,
	useMotionValue,
	useTransform,
	useSpring,
} from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * Props for the MasonryGrid component.
 * @template T - The type of the items in the grid.
 */
interface MasonryGridProps<T> {
	items: T[]
	renderItem: (item: T, index: number) => React.ReactNode
	className?: string
	gap?: string
	keyExtractor?: (item: T, index: number) => string | number
}

// A self-contained GridItem component to handle advanced animations
const GridItem = ({ children }: { children: React.ReactNode }) => {
	const ref = React.useRef<HTMLDivElement>(null)

	// Motion values to track mouse position
	const x = useMotionValue(0)
	const y = useMotionValue(0)

	// Spring animations for smoother transform changes
	const mouseXSpring = useSpring(x, { stiffness: 300, damping: 20 })
	const mouseYSpring = useSpring(y, { stiffness: 300, damping: 20 })

	// Transform mouse position into 3D rotation
	const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['5deg', '-5deg'])
	const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-5deg', '5deg'])

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!ref.current) return
		const { left, top, width, height } = ref.current.getBoundingClientRect()
		const mouseX = e.clientX - left
		const mouseY = e.clientY - top

		// Normalize mouse position to a range of -0.5 to 0.5
		x.set(mouseX / width - 0.5)
		y.set(mouseY / height - 0.5)
	}

	const handleMouseLeave = () => {
		x.set(0)
		y.set(0)
	}

	return (
		<motion.div
			ref={ref}
			onMouseMove={handleMouseMove}
			onMouseLeave={handleMouseLeave}
			style={{
				transformStyle: 'preserve-3d',
				perspective: '1000px',
			}}
			className="relative"
		>
			<motion.div
				style={{
					rotateX,
					rotateY,
					transformStyle: 'preserve-3d',
				}}
				whileTap={{ scale: 0.98 }}
				className="h-full w-full"
			>
				{children}
			</motion.div>
		</motion.div>
	)
}

const MasonryGrid = <T,>({
	items,
	renderItem,
	className,
	gap = '1.5rem',
	keyExtractor,
}: MasonryGridProps<T>) => {
	return (
		<div
			className={cn('w-full', className)}
			style={{ columnGap: gap }}
			role="list"
		>
			{items.map((item, index) => (
				<div
					key={keyExtractor ? keyExtractor(item, index) : index}
					className="mb-6 break-inside-avoid"
					role="listitem"
				>
					<GridItem>{renderItem(item, index)}</GridItem>
				</div>
			))}
		</div>
	)
}

export default MasonryGrid

