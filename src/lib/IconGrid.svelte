<script>
	import DrawDonut from '$lib/DrawDonut.svelte';
	import prediction from '$lib/data/bundestag_prediction_2026_simulation.json';

	let donutCount = '50';
	const simulationSampleSize = prediction.statistical?.sample_size ?? 1500;

	const parties = Object.keys(prediction.vote_shares || {});
	const baseShares = parties.map((party) => prediction.vote_shares[party] || 0);
	const totalShare = baseShares.reduce((sum, value) => sum + value, 0) || 100;
	const probabilities = baseShares.map((value) => value / totalShare);
	const goldenAngle = Math.PI * (3 - Math.sqrt(5));
	const donutSize = 62;
	const donutInner = 18;

	let draws = [];
	let laidOutDraws = [];
	let fieldSize = donutSize + 10;

	function handleChange(e) {
		donutCount = e.target.value;
	}

	function simulateOnce(n, probs) {
		const counts = new Array(probs.length).fill(0);
		for (let i = 0; i < n; i++) {
			const r = Math.random();
			let cumulative = 0;
			for (let j = 0; j < probs.length; j++) {
				cumulative += probs[j];
				if (r < cumulative) {
					counts[j]++;
					break;
				}
			}
		}
		return counts;
	}

	function buildDraw() {
		const counts = simulateOnce(simulationSampleSize, probabilities);
		const total = counts.reduce((sum, value) => sum + value, 0) || 1;
		return parties.map((party, index) => ({
			party,
			value: counts[index] / total
		}));
	}

	function getSunflowerPosition(index, spacing) {
		const angle = index * goldenAngle;
		const radius = spacing * Math.sqrt(index + 0.5);
		return {
			x: radius * Math.cos(angle),
			y: radius * Math.sin(angle)
		};
	}

	$: {
		const count = Math.max(1, +donutCount);
		draws = Array.from({ length: count }, () => buildDraw());

		const unitPositions = Array.from({ length: count }, (_, index) =>
			getSunflowerPosition(index, 1)
		);
		let minUnitDistance = Number.POSITIVE_INFINITY;
		for (let i = 0; i < unitPositions.length; i++) {
			for (let j = i + 1; j < unitPositions.length; j++) {
				const dx = unitPositions[i].x - unitPositions[j].x;
				const dy = unitPositions[i].y - unitPositions[j].y;
				const d = Math.hypot(dx, dy);
				if (d < minUnitDistance) minUnitDistance = d;
			}
		}

		const targetMinCenterDistance = donutSize + 1;
		const spacing =
			minUnitDistance > 0 && Number.isFinite(minUnitDistance)
				? targetMinCenterDistance / minUnitDistance
				: donutSize;
		const positions = unitPositions.map((pos) => ({
			x: pos.x * spacing,
			y: pos.y * spacing
		}));
		const maxRadius =
			positions.reduce((max, pos) => Math.max(max, Math.hypot(pos.x, pos.y)), 0) +
			donutSize / 2 +
			4;
		fieldSize = Math.max(donutSize + 10, Math.ceil(maxRadius * 2));

		laidOutDraws = draws.map((parts, index) => {
			const pos = positions[index];
			return {
				parts,
				left: pos.x + fieldSize / 2 - donutSize / 2,
				top: pos.y + fieldSize / 2 - donutSize / 2
			};
		});
	}
</script>

<div class="controls">
	<label for="count-select">Number of donuts:</label>
	<select id="count-select" on:change={handleChange} bind:value={donutCount}>
		<option value="50">50</option>
		<option value="100">100</option>
		<option value="200">200</option>
		<option value="500">500</option>
	</select>
	<div class="summary">Showing {donutCount} simulation draws</div>
</div>

<div class="sunflower-wrap">
	<div class="sunflower" style={`width: ${fieldSize}px; height: ${fieldSize}px;`}>
		{#each laidOutDraws as draw}
			<div class="icon" style={`transform: translate(${draw.left}px, ${draw.top}px);`}>
				<DrawDonut parts={draw.parts} size={donutSize} inner={donutInner} />
			</div>
		{/each}
	</div>
</div>

<style>
	.controls {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 12px;
	}
	select {
		padding: 6px 8px;
	}
	.summary {
		color: #6b7280;
	}

	.sunflower-wrap {
		width: 100%;
		overflow: auto;
		padding: 2px 0 6px;
	}
	.sunflower {
		position: relative;
		margin: 0 auto;
	}
	.icon {
		position: absolute;
		left: 0;
		top: 0;
	}
</style>
