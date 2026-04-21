<script>
	import * as d3 from 'd3';
	import { UMAP } from 'umap-js';
	import DrawDonut from '$lib/DrawDonut.svelte';
	import SimulationTooltip from '$lib/SimulationTooltip.svelte';
	import { buildPhyllotaxisLayout } from '$lib/phyllotaxisLayout.js';
	import prediction from '$lib/data/bundestag_prediction_2026_simulation.json';

	const maxDonutSize = 62;
	const minDonutSize = 10;
	const viewportPadding = 32;
	const verticalReserve = 170;
	const layoutSeed = 20260421;

	let donutCount = '500';
	const simulationSampleSize = prediction.statistical?.sample_size ?? 1500;

	const parties = Object.keys(prediction.vote_shares || {});
	const baseShares = parties.map((party) => prediction.vote_shares[party] || 0);
	const totalShare = baseShares.reduce((sum, value) => sum + value, 0) || 100;
	const probabilities = baseShares.map((value) => value / totalShare);

	let viewportWidth = 1200;
	let viewportHeight = 800;
	let donutSize = maxDonutSize;
	let donutInner = 18;
	let fieldSize = 900;

	let draws = [];
	let laidOutDraws = [];
	let minimumShares = {};
	let tooltipParts = null;
	let tooltipDrawNumber = null;
	let tooltipX = 0;
	let tooltipY = 0;

	function handleChange(event) {
		donutCount = event.target.value;
		hideTooltip();
	}

	function seededRandom(seed) {
		let state = seed >>> 0;
		return () => {
			state = (state * 1664525 + 1013904223) >>> 0;
			return state / 4294967296;
		};
	}

	function clamp(value, min, max) {
		return Math.min(max, Math.max(min, value));
	}

	function simulateOnce(n, probs) {
		const counts = new Array(probs.length).fill(0);
		for (let i = 0; i < n; i += 1) {
			const r = Math.random();
			let cumulative = 0;
			for (let j = 0; j < probs.length; j += 1) {
				cumulative += probs[j];
				if (r < cumulative) {
					counts[j] += 1;
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

	function buildMinimumShares(pool) {
		const minimums = Object.fromEntries(parties.map((party) => [party, 1]));
		for (const draw of pool) {
			for (const part of draw) {
				minimums[part.party] = Math.min(minimums[part.party] ?? 1, part.value);
			}
		}
		return minimums;
	}

	function vectorFromParts(parts) {
		return parties.map((party) => parts.find((part) => part.party === party)?.value ?? 0);
	}

	function normalizeCoordinate(value, min, max, size) {
		if (Number.isNaN(value) || max - min < 1e-9) return size / 2;
		return ((value - min) / (max - min)) * size;
	}

	function normalizeAngle(angle) {
		return angle < 0 ? angle + Math.PI * 2 : angle;
	}

	function assignUmapToPhyllotaxis(nodes, layout, symbolSize) {
		if (nodes.length === 0) return [];

		const center = layout.fieldSize / 2;
		const nodePolar = nodes.map((node) => {
			const dx = node.x - center;
			const dy = node.y - center;
			return {
				...node,
				radius: Math.hypot(dx, dy),
				angle: normalizeAngle(Math.atan2(dy, dx))
			};
		});

		const slotPolar = layout.items.map((slot) => {
			const cx = slot.left + symbolSize / 2;
			const cy = slot.top + symbolSize / 2;
			const dx = cx - center;
			const dy = cy - center;
			return {
				slot,
				radius: Math.hypot(dx, dy),
				angle: normalizeAngle(Math.atan2(dy, dx))
			};
		});

		const maxNodeRadius = Math.max(...nodePolar.map((node) => node.radius), 1);
		const maxSlotRadius = Math.max(...slotPolar.map((slot) => slot.radius), 1);

		const rankedNodes = [...nodePolar].sort((a, b) => a.radius - b.radius || a.angle - b.angle);
		const availableSlots = [...slotPolar];
		const assignments = {};

		for (const node of rankedNodes) {
			let bestIndex = 0;
			let bestScore = Number.POSITIVE_INFINITY;

			for (let index = 0; index < availableSlots.length; index += 1) {
				const slot = availableSlots[index];
				const radialGap = Math.abs(node.radius / maxNodeRadius - slot.radius / maxSlotRadius);
				const angularGap = Math.min(
					Math.abs(node.angle - slot.angle),
					Math.PI * 2 - Math.abs(node.angle - slot.angle)
				);
				const score = radialGap * 1.8 + angularGap;

				if (score < bestScore) {
					bestScore = score;
					bestIndex = index;
				}
			}

			assignments[node.id] = availableSlots[bestIndex].slot;
			availableSlots.splice(bestIndex, 1);
		}

		return nodes.map((node) => ({
			...node,
			left: assignments[node.id].left,
			top: assignments[node.id].top
		}));
	}

	function buildUmapPhyllotaxisLayout(items, layout, symbolSize) {
		if (items.length === 0) return [];

		const radius = symbolSize / 2;
		const minX = radius + 8;
		const maxX = Math.max(minX, layout.fieldSize - radius - 8);
		const minY = radius + 8;
		const maxY = Math.max(minY, layout.fieldSize - radius - 8);

		if (items.length === 1) {
			return [
				{ ...items[0], left: layout.fieldSize / 2 - radius, top: layout.fieldSize / 2 - radius }
			];
		}

		const vectors = items.map((item) => vectorFromParts(item.parts));
		const umap = new UMAP({
			nComponents: 2,
			nNeighbors: Math.max(
				6,
				Math.min(items.length - 1, Math.round(Math.sqrt(items.length) * 1.8))
			),
			minDist: 0.18,
			spread: 1.0,
			nEpochs: 300,
			random: seededRandom(layoutSeed + items.length)
		});
		const embedding = umap.fit(vectors);
		const xExtent = d3.extent(embedding, ([x]) => x);
		const yExtent = d3.extent(embedding, ([, y]) => y);

		const nodes = items.map((item, index) => {
			const [x, y] = embedding[index];
			return {
				...item,
				x: clamp(
					normalizeCoordinate(x, xExtent[0] ?? 0, xExtent[1] ?? 1, layout.fieldSize),
					minX,
					maxX
				),
				y: clamp(
					normalizeCoordinate(y, yExtent[0] ?? 0, yExtent[1] ?? 1, layout.fieldSize),
					minY,
					maxY
				)
			};
		});

		return assignUmapToPhyllotaxis(nodes, layout, symbolSize);
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
		minimumShares = buildMinimumShares(draws);

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

		laidOutDraws = buildUmapPhyllotaxisLayout(
			draws.map((parts, index) => ({ parts, id: index })),
			layout,
			donutSize
		);
	}
</script>

<svelte:window bind:innerWidth={viewportWidth} bind:innerHeight={viewportHeight} />

<div class="icon-grid">
	<div class="controls">
		<label for="count-select">Anzahl Ziehungen:</label>
		<select id="count-select" on:change={handleChange} bind:value={donutCount}>
			<option value="50">50</option>
			<option value="100">100</option>
			<option value="200">200</option>
			<option value="500">500</option>
			<option value="1000">1000</option>
		</select>
	</div>

	<div class="umap-wrap">
		<div class="umap-field" style={`width: ${fieldSize}px; height: ${fieldSize}px;`}>
			{#each laidOutDraws as draw, index (draw.id)}
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
					<DrawDonut
						parts={draw.parts}
						size={donutSize}
						inner={donutInner}
						referenceMinimums={minimumShares}
					/>
				</div>
			{/each}
		</div>
	</div>
</div>

<SimulationTooltip
	parts={tooltipParts}
	drawNumber={tooltipDrawNumber}
	x={tooltipX}
	y={tooltipY}
	referenceMinimums={minimumShares}
/>

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

	.umap-wrap {
		width: 100%;
		overflow: auto;
		padding: 2px 0 6px;
	}

	.umap-field {
		position: relative;
		margin: 0 auto;
	}

	.icon {
		position: absolute;
		left: 0;
		top: 0;
	}
</style>
