/**
 * Changes every champion gets in ARAM: Mayhem, on top of the per-champion values of the cards
 */
export const MayhemGlobalChanges = ({ changes }: { changes: string[] }) => {
	if (changes.length === 0) return null

	return (
		<details className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
			<summary className="cursor-pointer font-semibold text-white">
				Every champion in Mayhem also gets ({changes.length})
			</summary>
			<ul className="mt-3 list-disc space-y-1 pl-5">
				{changes.map(change => (
					<li key={change}>{change}</li>
				))}
			</ul>
		</details>
	)
}
