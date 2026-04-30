<script>
	import * as d3 from 'd3';

	export let parts = [];
	export let size = 120;
	export let inner = 36;
	export let referenceMinimums = {};

	const partyColors = {
		'CDU/CSU': '#111111',
		SPD: '#E3000F',
		Greens: '#64A12D',
		AfD: '#009EE0',
		FDP: '#FFED00',
		BSW: '#6E2C91',
		'Die Linke': '#BE3075',
		Others: '#9CA3AF'
	};

	function getPartyColor(party) {
		return partyColors[party] || '#9CA3AF';
	}

	$: donutLayers = (() => {
		if (!parts || parts.length === 0) return [];
		const arcs = d3.pie().sort(null).padAngle(0.03)(parts.map(() => 1));
		const baseRadius = inner;
		const maxDepth = Math.max(4, size / 2 - inner);
		const adjustedShares = parts.map((part) =>
			Math.max(0, part.value - (referenceMinimums?.[part.party] ?? 0))
		);
		const maxAdjustedShare = Math.max(...adjustedShares, 0.0001);

		return arcs.map((arcData, index) => {
			const part = parts[index];
			const depth = (adjustedShares[index] / maxAdjustedShare) * maxDepth;
			return {
				party: part.party,
				path: d3
					.arc()
					.innerRadius(baseRadius)
					.outerRadius(baseRadius + depth)(arcData),
				fill: getPartyColor(part.party)
			};
		});
	})();
</script>

<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
	<g transform={`translate(${size / 2},${size / 2})`}>
		{#each donutLayers as layer (layer.party)}
			<path d={layer.path} fill={layer.fill} stroke="rgba(255,255,255,0.85)" stroke-width="0.8"
			></path>
		{/each}
	</g>
</svg>
