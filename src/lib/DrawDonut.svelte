<script>
	import * as d3 from 'd3';
	export let parts = []; // array of {party, value} values sum to 1
	export let size = 120;
	export let inner = 36;

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

	function escapeHtml(str) {
		return String(str)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	function getPartyColor(party) {
		return partyColors[party] || '#9CA3AF';
	}

	$: svgHtml = (() => {
		if (!parts || parts.length === 0) return '';
		const data = parts.map((p) => p.value);
		const colors = parts.map((p) => getPartyColor(p.party));
		const pie = d3.pie().sort(null);
		const arcs = pie(data);
		const arcGen = d3
			.arc()
			.innerRadius(inner)
			.outerRadius(size / 2);
		return arcs
			.map(
				(a, i) =>
					`<path d="${arcGen(a)}" fill="${escapeHtml(colors[i])}" stroke="#fff" stroke-width="1"></path>`
			)
			.join('');
	})();
</script>

<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
	<g transform={`translate(${size / 2},${size / 2})`}>
		{@html svgHtml}
	</g>
</svg>
