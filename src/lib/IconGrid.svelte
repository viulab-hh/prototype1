<script>
	import DrawDonut from '$lib/DrawDonut.svelte';
	import SimulationTooltip from '$lib/SimulationTooltip.svelte';
	import { buildPhyllotaxisLayout } from '$lib/phyllotaxisLayout.js';
	import prediction from '$lib/data/bundestag_prediction_2026_simulation.json';

	let donutCount = '200';
	const simulationSampleSize = prediction.statistical?.sample_size ?? 1500;

	const parties = Object.keys(prediction.vote_shares || {});
	const baseShares = parties.map((party) => prediction.vote_shares[party] || 0);
	const totalShare = baseShares.reduce((sum, value) => sum + value, 0) || 100;
	const probabilities = baseShares.map((value) => value / totalShare);
	const maxDonutSize = 62;
	const minDonutSize = 10;
	const viewportPadding = 32;
	const verticalReserve = 170;

	let viewportWidth = 1200;
	let viewportHeight = 800;
	let donutSize = maxDonutSize;
	let donutInner = 18;

	let draws = [];
	let laidOutDraws = [];
	let fieldSize = donutSize + 10;
	let tooltipParts = null;
	let tooltipDrawNumber = null;
	let tooltipX = 0;
	let tooltipY = 0;

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
			count: counts[index],
			value: counts[index] / total
		}));
	}

	function showTooltip(parts, drawNumber, event) {
		tooltipParts = parts;
		tooltipDrawNumber = drawNumber;
		moveTooltip(event);
	}

	function showTooltipFromElement(parts, drawNumber, element) {
		const rect = element.getBoundingClientRect();
		tooltipParts = parts;
		tooltipDrawNumber = drawNumber;
		tooltipX = rect.right + 8;
		tooltipY = rect.top + 8;
	}

	function moveTooltip(event) {
		tooltipX = event.clientX + 12;
		tooltipY = event.clientY + 12;
	}

	function hideTooltip() {
		tooltipParts = null;
		tooltipDrawNumber = null;
	}

	$: {
		const count = Math.max(1, +donutCount);
		draws = Array.from({ length: count }, () => buildDraw());
		const availableFieldSize = Math.max(
			220,
			Math.min(viewportWidth - viewportPadding, viewportHeight - verticalReserve)
		);

		const layout = buildPhyllotaxisLayout({
			count,
			availableFieldSize,
			minDonutSize,
			maxDonutSize,
			fieldPadding: 4,
			minGap: 1
		});

		donutSize = layout.donutSize;
		donutInner = Math.max(4, Math.round(donutSize * 0.29));
		fieldSize = layout.fieldSize;

		laidOutDraws = draws.map((parts, index) => {
			const pos = layout.items[index];
			return {
				parts,
				left: pos.left,
				top: pos.top
			};
		});
	}
</script>

<svelte:window bind:innerWidth={viewportWidth} bind:innerHeight={viewportHeight} />

<div class="icon-grid">
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

	<div class="phyllotaxis-wrap">
		<div class="phyllotaxis" style={`width: ${fieldSize}px; height: ${fieldSize}px;`}>
			{#each laidOutDraws as draw, index}
				<div
					class="icon"
					style={`transform: translate(${draw.left}px, ${draw.top}px);`}
					role="button"
					tabindex="0"
					on:mouseenter={(event) => showTooltip(draw.parts, index + 1, event)}
					on:mousemove={moveTooltip}
					on:mouseleave={hideTooltip}
					on:focus={(event) => showTooltipFromElement(draw.parts, index + 1, event.currentTarget)}
					on:blur={hideTooltip}
				>
					<DrawDonut parts={draw.parts} size={donutSize} inner={donutInner} />
				</div>
			{/each}
		</div>
	</div>
</div>

<SimulationTooltip parts={tooltipParts} drawNumber={tooltipDrawNumber} x={tooltipX} y={tooltipY} />

<style>
	.icon-grid {
		font-family: sans-serif;
	}
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

	.phyllotaxis-wrap {
		width: 100%;
		overflow: hidden;
		padding: 2px 0 6px;
	}
	.phyllotaxis {
		position: relative;
		margin: 0 auto;
	}
	.icon {
		position: absolute;
		left: 0;
		top: 0;
	}
</style>
