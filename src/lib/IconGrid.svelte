<script>
	import DrawDonut from '$lib/DrawDonut.svelte';
	import SimulationTooltip from '$lib/SimulationTooltip.svelte';
	import { buildPhyllotaxisLayout } from '$lib/phyllotaxisLayout.js';
	import prediction from '$lib/data/bundestag_prediction_2026_simulation.json';
	import { flip } from 'svelte/animate';
	import { SvelteMap } from 'svelte/reactivity';

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
	const waffleGap = 4;
	const splitGap = 16;
	const splitHeaderHeight = 26;

	let viewportWidth = 1200;
	let viewportHeight = 800;
	let donutSize = maxDonutSize;
	let donutInner = 18;

	let drawEntries = [];
	let laidOutDraws = [];
	let scenarioHeader = { left: '', right: '' };
	let availableFieldSize = 220;
	let fieldSize = donutSize + 10;
	let vizHeight = fieldSize;
	let clusterLabelAnchorX = 24;
	let highlightShareLabel = '';
	let highlightLabelPosition = null;
	let tooltipParts = null;
	let tooltipDrawNumber = null;
	let tooltipGroupSize = null;
	let tooltipX = 0;
	let tooltipY = 0;
	let sampledDraws = [];

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

	function buildMinimumShares(pool) {
		const minimums = Object.fromEntries(parties.map((party) => [party, 1]));
		for (const draw of pool) {
			for (const part of draw) {
				minimums[part.party] = Math.min(minimums[part.party] ?? 1, part.value);
			}
		}
		return minimums;
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

	const minimumShares = buildMinimumShares(Array.from({ length: 5000 }, () => buildDraw()));

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

	function buildPhyllotaxisView(count, fieldLimit) {
		const layout = buildPhyllotaxisLayout({
			count,
			availableFieldSize: fieldLimit,
			minDonutSize,
			maxDonutSize,
			fieldPadding: 4,
			minGap: 1
		});

		const resolvedDonutSize = layout.donutSize;
		const resolvedFieldSize = layout.fieldSize;
		return {
			layout,
			donutSize: resolvedDonutSize,
			donutInner: Math.max(4, Math.round(resolvedDonutSize * 0.29)),
			fieldSize: resolvedFieldSize,
			phyllotaxisOffsetX: Math.max(0, (fieldLimit - resolvedFieldSize) / 2)
		};
	}

	function partitionScenarioDraws(entries, mode) {
		const cfg = scenarioConfigs[mode];
		if (!cfg) {
			return {
				matching: [],
				other: [],
				header: { left: '', right: '' }
			};
		}

		const matching = [];
		const other = [];
		for (const draw of entries) {
			if (matchesScenario(draw.parts, mode)) {
				matching.push(draw);
			} else {
				other.push(draw);
			}
		}

		return {
			matching,
			other,
			header: {
				left: `${cfg.labelMatch} (${matching.length})`,
				right: `${cfg.labelOther} (${other.length})`
			}
		};
	}

	$: {
		const count = Math.max(1, +donutCount);
		const sharedFieldSize = Math.max(
			220,
			Math.min(viewportWidth - viewportPadding, viewportHeight - verticalReserve)
		);
		if (sampledDraws.length !== count) {
			sampledDraws = Array.from({ length: count }, () => buildDraw());
		}
		drawEntries = sampledDraws.map((parts, index) => ({
			parts,
			drawNumber: index + 1
		}));

		if (layoutMode === 'cluster') {
			const clusterDraws = drawEntries.map((draw, index) => ({
				id: index,
				drawNumber: draw.drawNumber,
				groupSize: 1,
				parts: draw.parts
			}));
			availableFieldSize = sharedFieldSize;
			const phyllotaxisView = buildPhyllotaxisView(count, availableFieldSize);
			donutSize = phyllotaxisView.donutSize;
			donutInner = phyllotaxisView.donutInner;
			fieldSize = phyllotaxisView.fieldSize;
			vizHeight = fieldSize;
			clusterLabelAnchorX = Math.max(12, phyllotaxisView.phyllotaxisOffsetX - 10);

			const decoratedDraws = clusterDraws.map((draw) => ({
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
				const pos = phyllotaxisView.layout.items[index];
				return {
					...draw,
					left: pos.left + phyllotaxisView.phyllotaxisOffsetX,
					top: pos.top
				};
			});

			const highlightedDraws = laidOutDraws.filter((draw) => draw.isHighlighted);
			const highlightCount = highlightedDraws.reduce((sum, draw) => sum + draw.groupSize, 0);
			highlightShareLabel =
				clusterDraws.length > 0
					? `${Math.round((highlightCount / clusterDraws.length) * 100)}%`
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
			scenarioHeader = { left: '', right: '' };
		} else {
			availableFieldSize = sharedFieldSize;
			const scenarioPartition = partitionScenarioDraws(drawEntries, scenarioMode);
			scenarioHeader = scenarioPartition.header;
			const phyllotaxisView = buildPhyllotaxisView(count, availableFieldSize);
			donutSize = phyllotaxisView.donutSize;
			donutInner = phyllotaxisView.donutInner;
			fieldSize = phyllotaxisView.fieldSize;
			const phyllotaxisPositions = new SvelteMap(
				phyllotaxisView.layout.items.map((pos, index) => [
					drawEntries[index].drawNumber,
					{
						left: pos.left + phyllotaxisView.phyllotaxisOffsetX,
						top: pos.top
					}
				])
			);

			const stackWidth = Math.max(80, Math.floor((availableFieldSize - splitGap) / 2));
			const splitCols = Math.max(1, Math.floor((stackWidth + waffleGap) / (donutSize + waffleGap)));

			const splitPositions = new SvelteMap();
			scenarioPartition.matching.forEach((draw, index) => {
				const pos = getWafflePosition(index, splitCols);
				splitPositions.set(draw.drawNumber, { left: pos.x, top: pos.y });
			});
			scenarioPartition.other.forEach((draw, index) => {
				const pos = getWafflePosition(index, splitCols);
				splitPositions.set(draw.drawNumber, {
					left: stackWidth + splitGap + pos.x,
					top: pos.y
				});
			});

			const leftRows = Math.ceil(scenarioPartition.matching.length / splitCols);
			const rightRows = Math.ceil(scenarioPartition.other.length / splitCols);
			const leftStackHeight = splitHeaderHeight + leftRows * (donutSize + waffleGap) - waffleGap;
			const rightStackHeight = splitHeaderHeight + rightRows * (donutSize + waffleGap) - waffleGap;
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
		{#each Object.entries(scenarioConfigs) as [scenarioKey, cfg] (scenarioKey)}
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
			<div class="stack-title left">{scenarioHeader.left}</div>
			<div class="stack-title right">{scenarioHeader.right}</div>
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
