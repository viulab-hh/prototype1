<script>
	import DrawDonut from '$lib/DrawDonut.svelte';
	import SimulationTooltip from '$lib/SimulationTooltip.svelte';
	import { buildPhyllotaxisLayout } from '$lib/phyllotaxisLayout.js';
	import prediction from '$lib/data/bundestag_prediction_2026_simulation.json';
	import { flip } from 'svelte/animate';

	const mergedDrawPoolSize = 5000;
	let donutCount = '500';
	let activeCase = 'none';
	const simulationSampleSize = prediction.statistical?.sample_size ?? 1500;

	const parties = Object.keys(prediction.vote_shares || {});
	const baseShares = parties.map((party) => prediction.vote_shares[party] || 0);
	const totalShare = baseShares.reduce((sum, value) => sum + value, 0) || 100;
	const probabilities = baseShares.map((value) => value / totalShare);
	const maxDonutSize = 62;
	const minDonutSize = 10;
	const viewportPadding = 32;
	const verticalReserve = 170;
	const maxLabelGutter = 140;

	let viewportWidth = 1200;
	let viewportHeight = 800;
	let donutSize = maxDonutSize;
	let donutInner = 18;

	let draws = [];
	let laidOutDraws = [];
	let fieldSize = donutSize + 10;
	let labelGutter = maxLabelGutter;
	let shellWidth = fieldSize + labelGutter;
	let highlightCount = 0;
	let highlightShareLabel = '';
	let highlightLabelPosition = null;
	let tooltipParts = null;
	let tooltipDrawNumber = null;
	let tooltipGroupSize = null;
	let tooltipX = 0;
	let tooltipY = 0;

	function handleChange(e) {
		donutCount = e.target.value;
		hideTooltip();
	}

	function selectCase(caseId) {
		activeCase = caseId;
		hideTooltip();
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

	function buildMergedDrawPool(poolSize) {
		return Array.from({ length: poolSize }, () => buildDraw());
	}

	function compareDraws(a, b) {
		for (const party of ['BSW', 'CDU/CSU', 'SPD', 'Greens', 'AfD', 'FDP', 'Die Linke', 'Others']) {
			const valueA = a.find((part) => part.party === party)?.value ?? 0;
			const valueB = b.find((part) => part.party === party)?.value ?? 0;
			if (valueA !== valueB) return valueA - valueB;
		}
		return 0;
	}

	function mergeDrawGroup(group) {
		const totals = Object.fromEntries(parties.map((party) => [party, 0]));
		for (const draw of group) {
			for (const part of draw) {
				totals[part.party] = (totals[part.party] ?? 0) + part.value;
			}
		}

		return parties.map((party) => {
			const meanValue = (totals[party] ?? 0) / group.length;
			return {
				party,
				value: meanValue,
				count: Math.round(meanValue * simulationSampleSize)
			};
		});
	}

	function buildMergedDraws(pool, targetCount) {
		if (pool.length === 0 || targetCount <= 0) return [];

		const sortedPool = [...pool].sort(compareDraws);
		const groupCount = Math.min(targetCount, sortedPool.length);

		return Array.from({ length: groupCount }, (_, index) => {
			const start = Math.floor((index * sortedPool.length) / groupCount);
			const end = Math.floor(((index + 1) * sortedPool.length) / groupCount);
			const group = sortedPool.slice(start, Math.max(start + 1, end));

			return {
				id: index,
				drawNumber: index + 1,
				groupSize: group.length,
				parts: mergeDrawGroup(group)
			};
		});
	}

	function isBswBelowThreshold(parts, threshold = 0.05) {
		return parts.some((part) => part.party === 'BSW' && part.value < threshold);
	}

	function matchesActiveCase(parts) {
		if (activeCase === 'bsw-below-5') return isBswBelowThreshold(parts);
		return false;
	}

	const mergedDrawPool = buildMergedDrawPool(mergedDrawPoolSize);

	function showTooltip(parts, drawNumber, groupSize, event) {
		tooltipParts = parts;
		tooltipDrawNumber = drawNumber;
		tooltipGroupSize = groupSize;
		moveTooltip(event);
	}

	function showTooltipFromElement(parts, drawNumber, groupSize, element) {
		const rect = element.getBoundingClientRect();
		tooltipParts = parts;
		tooltipDrawNumber = drawNumber;
		tooltipGroupSize = groupSize;
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
		tooltipGroupSize = null;
	}

	$: {
		const count = Math.max(1, +donutCount);
		draws = buildMergedDraws(mergedDrawPool, count);
		const availableShellWidth = Math.max(240, viewportWidth - viewportPadding);
		const availableShellHeight = Math.max(220, viewportHeight - verticalReserve);
		labelGutter = Math.round(Math.max(72, Math.min(maxLabelGutter, availableShellWidth * 0.18)));
		const availableFieldSize = Math.max(
			160,
			Math.min(availableShellWidth - labelGutter, availableShellHeight)
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
		shellWidth = fieldSize + labelGutter;

		const decoratedDraws = draws.map((draw) => ({
			...draw,
			isHighlighted: matchesActiveCase(draw.parts)
		}));

		const clusteredDraws =
			activeCase === 'none'
				? decoratedDraws
				: [...decoratedDraws].sort((a, b) => {
						if (a.isHighlighted === b.isHighlighted) return a.id - b.id;
						return a.isHighlighted ? -1 : 1;
					});

		laidOutDraws = clusteredDraws.map((draw, index) => {
			const pos = layout.items[index];
			return {
				...draw,
				left: pos.left,
				top: pos.top
			};
		});

		const highlightedDraws = laidOutDraws.filter((draw) => draw.isHighlighted);
		highlightCount = highlightedDraws.reduce((sum, draw) => sum + draw.groupSize, 0);
		highlightShareLabel =
			mergedDrawPool.length > 0
				? `${Math.round((highlightCount / mergedDrawPool.length) * 100)}%`
				: '';

		if (highlightedDraws.length > 0) {
			const minTop = Math.min(...highlightedDraws.map((draw) => draw.top));
			const maxBottom = Math.max(...highlightedDraws.map((draw) => draw.top + donutSize));
			highlightLabelPosition = {
				top: minTop + (maxBottom - minTop) / 2
			};
		} else {
			highlightLabelPosition = null;
		}
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
		<button
			type="button"
			class:active={activeCase === 'none'}
			class="case-button"
			on:click={() => selectCase('none')}
		>
			Alle
		</button>
		<button
			type="button"
			class:active={activeCase === 'bsw-below-5'}
			class="case-button"
			on:click={() => selectCase('bsw-below-5')}
		>
			BSW &lt; 5%
		</button>
	</div>

	<div class="phyllotaxis-wrap">
		<div class="viz-shell" style={`width: ${shellWidth}px;`}>
			{#if activeCase !== 'none' && highlightLabelPosition}
				<div
					class="highlight-count"
					style={`left: ${labelGutter / 2}px; top: ${highlightLabelPosition.top}px;`}
					aria-hidden="true"
				>
					{highlightShareLabel}
				</div>
			{/if}
			<div class="phyllotaxis" style={`width: ${fieldSize}px; height: ${fieldSize}px;`}>
				{#each laidOutDraws as draw (draw.id)}
					<div
						class="icon"
						class:dimmed={activeCase !== 'none' && !draw.isHighlighted}
						style={`transform: translate(${draw.left}px, ${draw.top}px);`}
						role="button"
						tabindex="0"
						animate:flip={{ duration: 450, easing: (t) => t * (2 - t) }}
						on:mouseenter={(event) =>
							showTooltip(draw.parts, draw.drawNumber, draw.groupSize, event)}
						on:mousemove={moveTooltip}
						on:mouseleave={hideTooltip}
						on:focus={(event) =>
							showTooltipFromElement(
								draw.parts,
								draw.drawNumber,
								draw.groupSize,
								event.currentTarget
							)}
						on:blur={hideTooltip}
					>
						<DrawDonut parts={draw.parts} size={donutSize} inner={donutInner} />
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

<SimulationTooltip
	parts={tooltipParts}
	drawNumber={tooltipDrawNumber}
	groupSize={tooltipGroupSize}
	x={tooltipX}
	y={tooltipY}
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
	.case-button {
		padding: 0.5rem 0.9rem;
		border: 1px solid rgba(17, 17, 17, 0.14);
		border-radius: 999px;
		background: #f3f4f6;
		color: #111827;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
		transition:
			background-color 180ms ease,
			border-color 180ms ease,
			color 180ms ease;
	}
	.case-button.active {
		background: rgba(17, 17, 17, 0.12);
		border-color: rgba(17, 17, 17, 0.28);
		color: #111111;
	}
	.summary {
		color: #6b7280;
	}

	.phyllotaxis-wrap {
		width: 100%;
		overflow: hidden;
		padding: 2px 0 6px;
	}
	.viz-shell {
		position: relative;
		margin: 0 auto;
	}
	.phyllotaxis {
		position: relative;
		margin-left: auto;
		transition:
			width 450ms ease,
			height 450ms ease;
	}
	.icon {
		position: absolute;
		left: 0;
		top: 0;
		z-index: 1;
		transition: opacity 180ms ease;
	}
	.icon.dimmed {
		opacity: 0.22;
	}
	.highlight-count {
		position: absolute;
		z-index: 0;
		color: rgba(17, 17, 17, 0.3);
		font-size: clamp(2.5rem, 6vw, 5.5rem);
		font-weight: 700;
		line-height: 1;
		transform: translate(-100%, -50%);
		pointer-events: none;
		user-select: none;
	}
</style>
