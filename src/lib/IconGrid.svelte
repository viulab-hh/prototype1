<script>
	import DrawDonut from '$lib/DrawDonut.svelte';
	import SimulationTooltip from '$lib/SimulationTooltip.svelte';
	import { buildPhyllotaxisLayout } from '$lib/phyllotaxisLayout.js';
	import prediction from '$lib/data/bundestag_prediction_2026_simulation.json';
	import { flip } from 'svelte/animate';
	import { SvelteMap } from 'svelte/reactivity';

	const mergedDrawPoolSize = 5000;
	let donutCount = '200';
	let layoutMode = 'waffle';
	let scenarioMode = 'none';
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
	const waffleGap = 4;
	const splitGap = 16;
	const splitHeaderHeight = 26;

	let viewportWidth = 1200;
	let viewportHeight = 800;
	let donutSize = maxDonutSize;
	let donutInner = 18;

	let draws = [];
	let drawEntries = [];
	let laidOutDraws = [];
	let activeLeftDraws = [];
	let activeRightDraws = [];
	let leftTitle = '';
	let rightTitle = '';
	let availableFieldSize = 220;
	let fieldSize = donutSize + 10;
	let vizHeight = fieldSize;
	let splitCols = 1;
	let leftStackHeight = 0;
	let rightStackHeight = 0;
	let labelGutter = maxLabelGutter;
	let shellWidth = fieldSize + labelGutter;
	let clusterLabelAnchorX = 24;
	let highlightCount = 0;
	let highlightShareLabel = '';
	let highlightLabelPosition = null;
	let tooltipParts = null;
	let tooltipDrawNumber = null;
	let tooltipGroupSize = null;
	let tooltipX = 0;
	let tooltipY = 0;
	let sampledDraws = [];
	let sampledDrawCount = 0;

	const scenarioConfigs = {
		linke5: {
			parties: ['Die Linke'],
			threshold: 0.05,
			comparison: 'gte',
			labelMatch: 'Die Linke ≥ 5%',
			labelOther: 'Die Linke < 5%',
			buttonLabel: 'Die Linke über 5%'
		},
		fdp5: {
			parties: ['FDP'],
			threshold: 0.08,
			comparison: 'gte',
			labelMatch: 'FDP ≥ 8%',
			labelOther: 'FDP < 8%',
			buttonLabel: 'FDP über 8%'
		},
		spdgruenelinke40: {
			parties: ['SPD', 'Greens', 'Die Linke'],
			threshold: 0.4,
			comparison: 'gte',
			labelMatch: 'SPD + Grüne + Die Linke ≥ 40%',
			labelOther: 'SPD + Grüne + Die Linke < 40%',
			buttonLabel: 'SPD + Grüne + Die Linke über 40%'
		},
		cdu25: {
			parties: ['CDU/CSU'],
			threshold: 0.25,
			comparison: 'gte',
			labelMatch: 'CDU/CSU ≥ 25%',
			labelOther: 'CDU/CSU < 25%',
			buttonLabel: 'CDU/CSU über 25%'
		},
		'bsw-below-5': {
			parties: ['BSW'],
			threshold: 0.05,
			comparison: 'lt',
			labelMatch: 'BSW < 5%',
			labelOther: 'BSW ≥ 5%',
			buttonLabel: 'BSW unter 5%'
		}
	};

	function setLayoutMode(mode) {
		layoutMode = mode;
		hideTooltip();
	}

	function toggleScenario(mode) {
		scenarioMode = scenarioMode === mode ? 'none' : mode;
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

	function buildMinimumShares(pool) {
		const minimums = Object.fromEntries(parties.map((party) => [party, 1]));
		for (const draw of pool) {
			for (const part of draw) {
				minimums[part.party] = Math.min(minimums[part.party] ?? 1, part.value);
			}
		}
		return minimums;
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

	function matchesScenario(parts, mode) {
		if (mode === 'none') return false;
		const cfg = scenarioConfigs[mode];
		if (!cfg) return false;
		const share = getPartyShare(parts, ...cfg.parties);
		return cfg.comparison === 'lt' ? share < cfg.threshold : share >= cfg.threshold;
	}

	function getMaximumPartyShare(parts) {
		return Math.max(...parts.map((part) => part.value), 0);
	}

	const mergedDrawPool = buildMergedDrawPool(mergedDrawPoolSize);
	const minimumShares = buildMinimumShares(mergedDrawPool);

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

	function getPartyShare(parts, ...names) {
		return names.reduce((sum, name) => sum + (parts.find((p) => p.party === name)?.value ?? 0), 0);
	}

	function getWafflePosition(index, columns) {
		const column = index % columns;
		const row = Math.floor(index / columns);
		return {
			x: column * (donutSize + waffleGap),
			y: splitHeaderHeight + row * (donutSize + waffleGap)
		};
	}

	$: {
		const count = Math.max(1, +donutCount);
		const sharedFieldSize = Math.max(
			220,
			Math.min(viewportWidth - viewportPadding, viewportHeight - verticalReserve)
		);
		if (sampledDrawCount !== count) {
			sampledDraws = Array.from({ length: count }, () => buildDraw());
			sampledDrawCount = count;
		}
		drawEntries = sampledDraws.map((parts, index) => ({
			parts,
			drawNumber: index + 1
		}));

		if (layoutMode === 'cluster') {
			draws = drawEntries.map((draw, index) => ({
				id: index,
				drawNumber: draw.drawNumber,
				groupSize: 1,
				parts: draw.parts
			}));
			availableFieldSize = sharedFieldSize;

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
			shellWidth = availableFieldSize;
			labelGutter = Math.round(Math.max(72, Math.min(maxLabelGutter, availableFieldSize * 0.18)));
			vizHeight = fieldSize;
			const phyllotaxisOffsetX = Math.max(0, (availableFieldSize - fieldSize) / 2);
			clusterLabelAnchorX = Math.max(12, phyllotaxisOffsetX - 10);

			const decoratedDraws = draws.map((draw) => ({
				...draw,
				isHighlighted: matchesScenario(draw.parts, scenarioMode)
			}));

			const clusteredDraws =
				scenarioMode === 'none'
					? [...decoratedDraws].sort(
							(a, b) => getMaximumPartyShare(b.parts) - getMaximumPartyShare(a.parts) || a.id - b.id
						)
					: [...decoratedDraws].sort((a, b) => {
							if (a.isHighlighted !== b.isHighlighted) return a.isHighlighted ? -1 : 1;
							return getMaximumPartyShare(b.parts) - getMaximumPartyShare(a.parts) || a.id - b.id;
						});

			laidOutDraws = clusteredDraws.map((draw, index) => {
				const pos = layout.items[index];
				return {
					...draw,
					left: pos.left + phyllotaxisOffsetX,
					top: pos.top
				};
			});

			const highlightedDraws = laidOutDraws.filter((draw) => draw.isHighlighted);
			highlightCount = highlightedDraws.reduce((sum, draw) => sum + draw.groupSize, 0);
			highlightShareLabel =
				draws.length > 0 ? `${Math.round((highlightCount / draws.length) * 100)}%` : '';
			if (highlightedDraws.length > 0) {
				const minTop = Math.min(...highlightedDraws.map((draw) => draw.top));
				const maxBottom = Math.max(...highlightedDraws.map((draw) => draw.top + donutSize));
				highlightLabelPosition = {
					top: minTop + (maxBottom - minTop) / 2
				};
			} else {
				highlightLabelPosition = null;
			}

			activeLeftDraws = [];
			activeRightDraws = [];
			leftTitle = '';
			rightTitle = '';
		} else {
			draws = sampledDraws;

			const cfg = scenarioConfigs[scenarioMode];
			if (cfg) {
				activeLeftDraws = drawEntries.filter((d) => matchesScenario(d.parts, scenarioMode));
				activeRightDraws = drawEntries.filter((d) => !matchesScenario(d.parts, scenarioMode));
				leftTitle = `${cfg.labelMatch} (${activeLeftDraws.length})`;
				rightTitle = `${cfg.labelOther} (${activeRightDraws.length})`;
			} else {
				activeLeftDraws = [];
				activeRightDraws = [];
				leftTitle = '';
				rightTitle = '';
			}

			availableFieldSize = sharedFieldSize;

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
			shellWidth = availableFieldSize;

			const phyllotaxisOffsetX = Math.max(0, (availableFieldSize - fieldSize) / 2);
			const phyllotaxisPositions = new SvelteMap(
				layout.items.map((pos, index) => [
					drawEntries[index].drawNumber,
					{
						left: pos.left + phyllotaxisOffsetX,
						top: pos.top
					}
				])
			);

			const stackWidth = Math.max(80, Math.floor((availableFieldSize - splitGap) / 2));
			splitCols = Math.max(1, Math.floor((stackWidth + waffleGap) / (donutSize + waffleGap)));

			const splitPositions = new SvelteMap();
			activeLeftDraws.forEach((draw, index) => {
				const pos = getWafflePosition(index, splitCols);
				splitPositions.set(draw.drawNumber, { left: pos.x, top: pos.y });
			});
			activeRightDraws.forEach((draw, index) => {
				const pos = getWafflePosition(index, splitCols);
				splitPositions.set(draw.drawNumber, {
					left: stackWidth + splitGap + pos.x,
					top: pos.y
				});
			});

			const leftRows = Math.ceil(activeLeftDraws.length / splitCols);
			const rightRows = Math.ceil(activeRightDraws.length / splitCols);
			leftStackHeight = splitHeaderHeight + leftRows * (donutSize + waffleGap) - waffleGap;
			rightStackHeight = splitHeaderHeight + rightRows * (donutSize + waffleGap) - waffleGap;
			vizHeight =
				scenarioMode !== 'none'
					? Math.max(splitHeaderHeight, leftStackHeight, rightStackHeight)
					: fieldSize;

			laidOutDraws = drawEntries.map((draw) => {
				const activePos =
					scenarioMode !== 'none'
						? splitPositions.get(draw.drawNumber)
						: phyllotaxisPositions.get(draw.drawNumber);
				return {
					parts: draw.parts,
					drawNumber: draw.drawNumber,
					left: activePos?.left ?? 0,
					top: activePos?.top ?? 0,
					groupSize: null
				};
			});

			highlightCount = 0;
			highlightShareLabel = '';
			highlightLabelPosition = null;
		}
	}
</script>

<svelte:window bind:innerWidth={viewportWidth} bind:innerHeight={viewportHeight} />

<div class="icon-grid">
	<div class="layout-switch" role="group" aria-label="Layout Auswahl">
		<span class="layout-label">Ansicht:</span>
		<button
			type="button"
			class="layout-btn"
			class:active={layoutMode === 'waffle'}
			on:click={() => setLayoutMode('waffle')}
		>
			Waffle Layout
		</button>
		<button
			type="button"
			class="layout-btn"
			class:active={layoutMode === 'cluster'}
			on:click={() => setLayoutMode('cluster')}
		>
			Cluster Layout
		</button>
	</div>

	<div class="controls">
		<label for="count-select">Anzahl Ziehungen:</label>
		<select id="count-select" bind:value={donutCount}>
			<option value="50">50</option>
			<option value="100">100</option>
			<option value="200">200</option>
			<option value="500">500</option>
			<option value="1000">1000</option>
		</select>
		<button
			type="button"
			class="case-button"
			class:active={scenarioMode === 'none'}
			on:click={() => toggleScenario('none')}
		>
			Alle
		</button>
		{#each Object.entries(scenarioConfigs) as [scenarioKey, cfg]}
			<button
				type="button"
				class="case-button"
				class:active={scenarioMode === scenarioKey}
				on:click={() => toggleScenario(scenarioKey)}
			>
				{cfg.buttonLabel}
			</button>
		{/each}
	</div>

	<div
		class="stage-wrap"
		class:cluster-stage={layoutMode === 'cluster'}
		class:waffle-stage={layoutMode !== 'cluster'}
		style={`width:${availableFieldSize}px; height:${layoutMode === 'cluster' ? fieldSize : vizHeight}px;`}
	>
		{#if layoutMode === 'cluster' && highlightLabelPosition}
			<div
				class="highlight-count"
				style={`left: ${clusterLabelAnchorX}px; top: ${highlightLabelPosition.top}px;`}
				aria-hidden="true"
			>
				{highlightShareLabel}
			</div>
		{/if}

		{#if layoutMode !== 'cluster' && scenarioMode !== 'none'}
			<div class="stack-title left">{leftTitle}</div>
			<div class="stack-title right">{rightTitle}</div>
		{/if}

		<div
			class="stage-canvas"
			style={`width:${availableFieldSize}px; height:${layoutMode === 'cluster' ? fieldSize : vizHeight}px;`}
		>
			{#each laidOutDraws as draw (draw.drawNumber)}
				<div
					class="icon"
					class:cluster-icon={layoutMode === 'cluster'}
					class:dimmed={layoutMode === 'cluster' && scenarioMode !== 'none' && !draw.isHighlighted}
					style={`transform: translate(${draw.left}px, ${draw.top}px);`}
					role="button"
					tabindex="0"
					animate:flip={{ duration: 450, easing: (t) => t * (2 - t) }}
					on:mouseenter={(event) =>
						showTooltip(draw.parts, draw.drawNumber, draw.groupSize ?? null, event)}
					on:mousemove={moveTooltip}
					on:mouseleave={hideTooltip}
					on:focus={(event) =>
						showTooltipFromElement(
							draw.parts,
							draw.drawNumber,
							draw.groupSize ?? null,
							event.currentTarget
						)}
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
	groupSize={tooltipGroupSize}
	x={tooltipX}
	y={tooltipY}
	referenceMinimums={minimumShares}
/>

<style>
	.icon-grid {
		font-family: sans-serif;
	}
	.layout-switch {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 8px 10px;
		border: 1px solid #dbeafe;
		border-radius: 10px;
		background: #eff6ff;
		margin-bottom: 10px;
	}
	.layout-label {
		font-size: 0.82rem;
		font-weight: 700;
		color: #1e3a8a;
	}
	.controls {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 12px;
		flex-wrap: wrap;
	}
	select {
		padding: 6px 8px;
	}
	.layout-btn {
		padding: 6px 10px;
		border: 1px solid #c7d2fe;
		border-radius: 6px;
		background: #eef2ff;
		cursor: pointer;
		font-weight: 600;
		transition:
			background-color 180ms ease,
			border-color 180ms ease;
	}
	.layout-btn.active {
		background: #c7d2fe;
		border-color: #818cf8;
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
	.stage-wrap {
		position: relative;
		margin: 0 auto;
		transition: height 650ms cubic-bezier(0.2, 0.75, 0.2, 1);
	}
	.waffle-stage {
		overflow: hidden;
	}
	.cluster-stage {
		overflow: visible;
	}
	.stack-title {
		position: absolute;
		top: 0;
		width: calc((100% - 16px) / 2);
		font-size: 0.9rem;
		font-weight: 600;
		line-height: 1.2;
		pointer-events: none;
	}
	.stack-title.left {
		left: 0;
	}
	.stack-title.right {
		left: calc(((100% - 16px) / 2) + 16px);
	}
	.stage-canvas {
		position: relative;
		margin: 0 auto;
		transition:
			width 450ms ease,
			height 450ms ease;
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
	.icon {
		position: absolute;
		left: 0;
		top: 0;
		transition: transform 650ms cubic-bezier(0.2, 0.75, 0.2, 1);
	}
	.cluster-icon {
		z-index: 1;
		transition: opacity 220ms ease;
	}
	.icon.dimmed {
		opacity: 0.2;
	}
</style>
