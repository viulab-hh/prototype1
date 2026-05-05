<script>
	import * as d3 from 'd3';
	import { getPartyColor } from '$lib/constants/parties.js';

	export let parts = [];
	export let size = 120;
	export let inner = 36;
	export let referenceMinimums = {};

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
