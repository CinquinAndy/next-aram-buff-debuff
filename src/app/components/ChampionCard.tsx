import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Champion } from '@/app/lib/types'

interface ChampionCardProps {
	champion: Champion
}

const formatModifier = (value: number) => {
	if (!value || value === 1) return null
	return ((value - 1) * 100).toFixed(1)
}

const StatModifier = ({ value, label }: { value: number; label: string }) => {
	const formatted = formatModifier(value)
	if (!formatted) return null

	return (
		<div className="flex items-center justify-between py-1">
			<span className="text-sm text-gray-600">{label}:</span>
			<div
				className={`flex items-center ${Number(formatted) > 0 ? 'text-green-600' : 'text-red-600'}`}
			>
				{Number(formatted) > 0 ? (
					<ArrowUpCircle className="mr-1 h-4 w-4" />
				) : (
					<ArrowDownCircle className="mr-1 h-4 w-4" />
				)}
				{Number(formatted) > 0 ? `+${formatted}` : formatted}%
			</div>
		</div>
	)
}

export function ChampionCard({ champion }: ChampionCardProps) {
	return (
		<Card className="transition-shadow hover:shadow-lg">
			<CardContent className="pt-6">
				<h3 className="mb-4 text-lg font-bold">{champion.name}</h3>
				<div className="space-y-2">
					<StatModifier value={champion.aram.dmg_dealt} label="Damage Dealt" />
					<StatModifier value={champion.aram.dmg_taken} label="Damage Taken" />
					<StatModifier value={champion.aram.healing} label="Healing" />
					<StatModifier value={champion.aram.shielding} label="Shielding" />
					<StatModifier
						value={champion.aram.ability_haste}
						label="Ability Haste"
					/>
				</div>
			</CardContent>
		</Card>
	)
}
