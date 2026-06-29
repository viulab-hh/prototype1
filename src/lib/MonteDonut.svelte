<script>
	import * as d3 from 'd3';
	import { onMount } from 'svelte';
	import { simulateOnce } from '$lib/simulation/simulation.js';
	import { MONTE_DONUT_RADIUS, MONTE_DONUT_INNER } from '$lib/constants/layoutConfig.js';
	import { getPartyLabel } from '$lib/constants/parties.js';
	export let voteShares = {};
	export let sampleSize = 50;
	export let sims = 1000;
	export let width = 240;
	export let height = 240;

	let parties = Object.keys(voteShares);
	let probs = parties.map((p) => voteShares[p] || 0);
	const total = probs.reduce((a, b) => a + b, 0) || 100;
	probs = probs.map((v) => v / total);

	let stats = [];

	function quantile(arr, q) {
		const a = arr.slice().sort((x, y) => x - y);
		const pos = (a.length - 1) * q;
		const base = Math.floor(pos);
		const rest = pos - base;
		if (a[base + 1] !== undefined) return a[base] + rest * (a[base + 1] - a[base]);
		return a[base];
	}

	let mounted = false;

	onMount(() => {
		run();
		mounted = true;
	});

	function run() {
		const n = Math.max(1, +sampleSize);
		const iters = Math.max(1, +sims);
		const k = probs.length;
		const accum = Array.from({ length: k }, () => []);
		for (let t = 0; t < iters; t++) {
			const counts = simulateOnce(n, probs);
			for (let j = 0; j < k; j++) accum[j].push(counts[j] / n);
		}
		stats = parties.map((p, idx) => {
			const arr = accum[idx];
			const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
			const sd = Math.sqrt(
				arr.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (arr.length - 1 || 1)
			);
			const ci_low = quantile(arr, 0.025);
			const ci_high = quantile(arr, 0.975);
			return { party: p, mean, sd, ci: [ci_low, ci_high] };
		});
	}
	const radius = MONTE_DONUT_RADIUS;
	const inner = MONTE_DONUT_INNER;
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

	function buildSlices(stats) {
		const total = stats.reduce((s, x) => s + x.mean, 0) || 1;
		const data = stats.map((s) => s.mean / total);
		const pie = d3.pie().sort(null);
		const arcs = pie(data);
		const arcGen = d3.arc().innerRadius(inner).outerRadius(radius);
		return arcs.map((a, i) => ({
			path: arcGen(a),
			fill: palette[i % palette.length],
			party: stats[i].party,
			mean: stats[i].mean,
			sd: stats[i].sd
		}));
	}

	$: displayStats = mounted
		? stats
		: parties.map((p) => ({ party: p, mean: (voteShares[p] || 0) / 100, sd: 0 }));
	$: slices = buildSlices(displayStats);
</script>

<svg {width} {height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
	<g transform={`translate(${width / 2},${height / 2})`}>
		{#each slices as slice (slice.party)}
			<path d={slice.path} fill={slice.fill} stroke="#fff" stroke-width="1" />
		{/each}
		<g transform={`translate(-${radius + 10},-${radius})`}>
			{#each slices as slice, i (slice.party)}
				<text x="0" y={i * 16} font-size="12">
					{getPartyLabel(slice.party)}: {(slice.mean * 100).toFixed(1)}% (±{(
						slice.sd * 100
					).toFixed(2)}%)
				</text>
			{/each}
		</g>
	</g>
</svg>
