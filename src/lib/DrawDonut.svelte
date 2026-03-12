<script>
	import * as d3 from 'd3';
	export let parts = []; // array of {party, value} values sum to 1
	export let size = 80;
	export let inner = 30;

	const palette = [
		'#2563EB',
		'#10B981',
		'#F59E0B',
		'#EF4444',
		'#8B5CF6',
		'#06B6D4',
		'#F97316',
		'#8B5CF6'
	];

	function escapeHtml(str) {
		return String(str)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	$: svgHtml = (() => {
		if (!parts || parts.length === 0) return '';
		const data = parts.map((p) => p.value);
		const pie = d3.pie().sort(null);
		const arcs = pie(data);
		const arcGen = d3
			.arc()
			.innerRadius(inner)
			.outerRadius(size / 2);
		return arcs
			.map(
				(a, i) =>
					`<path d="${arcGen(a)}" fill="${escapeHtml(palette[i % palette.length])}" stroke="#fff" stroke-width="0.5"></path>`
			)
			.join('');
	})();
</script>

<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
	<g transform={`translate(${size / 2},${size / 2})`}>
		{@html svgHtml}
	</g>
</svg>
