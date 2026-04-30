<script>
	import * as d3 from 'd3';
	import DrawDonut from '$lib/DrawDonut.svelte';
	import SimulationTooltip from '$lib/SimulationTooltip.svelte';
	import { buildPhyllotaxisLayout } from '$lib/phyllotaxisLayout.js';
	import prediction from '$lib/data/bundestag_prediction_2026_simulation.json';
	import { flip } from 'svelte/animate';
	import { SvelteMap } from 'svelte/reactivity';

	const mergedDrawPoolSize = 5000;
	let donutCount = '200';
	let layoutMode = 'waffle';
	let activeCase = 'none';
	let splitMode = 'none';
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
	let highlightClusterPath = null;
	let highlightCount = 0;
	let highlightShareLabel = '';
	let highlightLabelPosition = null;
	let tooltipParts = null;
	let tooltipDrawNumber = null;
	let tooltipGroupSize = null;
	let tooltipX = 0;
	let tooltipY = 0;

	const splitConfigs = {
		linke5: {
			parties: ['Die Linke'],
			threshold: 0.05,
			labelGte: 'Die Linke ≥ 5%',
			labelLt: 'Die Linke < 5%'
		},
		fdp5: {
			parties: ['FDP'],
			threshold: 0.08,
			labelGte: 'FDP ≥ 8%',
			labelLt: 'FDP < 8%'
		},
		spdgruenelinke40: {
			parties: ['SPD', 'Greens', 'Die Linke'],
			threshold: 0.4,
			labelGte: 'SPD + Grüne + Die Linke ≥ 40%',
			labelLt: 'SPD + Grüne + Die Linke < 40%'
		},
		cdu25: {
			parties: ['CDU/CSU'],
			threshold: 0.25,
			labelGte: 'CDU/CSU ≥ 25%',
			labelLt: 'CDU/CSU < 25%'
		}
	};

	const mergedDrawPool = buildMergedDrawPool(mergedDrawPoolSize);

	function setLayoutMode(mode) {
		layoutMode = mode;
		hideTooltip();
	}

	function toggleSplitMode(mode) {
		splitMode = splitMode === mode ? 'none' : mode;
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
		const totals = new Map(parties.map((party) => [party, 0]));
		for (const draw of group) {
			for (const part of draw) {
				totals.set(part.party, (totals.get(part.party) ?? 0) + part.value);
			}
		}

		return parties.map((party) => {
			const meanValue = (totals.get(party) ?? 0) / group.length;
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

	function buildClusterHullPath(highlightedDraws, size) {
		if (highlightedDraws.length === 0) return null;

		const centerRadius = size * 0.62;
		const perimeterPoints = highlightedDraws.flatMap((draw) => {
			const cx = draw.left + size / 2;
			const cy = draw.top + size / 2;
			return Array.from({ length: 10 }, (_, step) => {
				const angle = (step / 10) * Math.PI * 2;
				return [cx + Math.cos(angle) * centerRadius, cy + Math.sin(angle) * centerRadius];
			});
		});

		const hull = d3.polygonHull(perimeterPoints);
		if (!hull || hull.length < 3) return null;

		return d3.line().curve(d3.curveCatmullRomClosed.alpha(0.7))(hull);
	}

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

		if (layoutMode === 'cluster') {
			draws = buildMergedDraws(mergedDrawPool, count);
			const availableShellWidth = Math.max(240, viewportWidth - viewportPadding);
			const availableShellHeight = Math.max(220, viewportHeight - verticalReserve);
			labelGutter = Math.round(Math.max(72, Math.min(maxLabelGutter, availableShellWidth * 0.18)));
			availableFieldSize = Math.max(
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
			vizHeight = fieldSize;

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
			highlightClusterPath = buildClusterHullPath(highlightedDraws, donutSize);
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
			draws = Array.from({ length: count }, () => buildDraw());
			drawEntries = draws.map((parts, index) => ({
				parts,
				drawNumber: index + 1
			}));

			const cfg = splitConfigs[splitMode];
			if (cfg) {
				activeLeftDraws = drawEntries.filter(
					(d) => getPartyShare(d.parts, ...cfg.parties) >= cfg.threshold
				);
				activeRightDraws = drawEntries.filter(
					(d) => getPartyShare(d.parts, ...cfg.parties) < cfg.threshold
				);
				leftTitle = `${cfg.labelGte} (${activeLeftDraws.length})`;
				rightTitle = `${cfg.labelLt} (${activeRightDraws.length})`;
			} else {
				activeLeftDraws = [];
				activeRightDraws = [];
				leftTitle = '';
				rightTitle = '';
			}

			availableFieldSize = Math.max(
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
				splitMode !== 'none'
					? Math.max(splitHeaderHeight, leftStackHeight, rightStackHeight)
					: fieldSize;

			laidOutDraws = drawEntries.map((draw) => {
				const activePos =
					splitMode !== 'none'
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

			highlightClusterPath = null;
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

		{#if layoutMode === 'waffle'}
			<button
				type="button"
				class="split-btn"
				class:active={splitMode === 'linke5'}
				on:click={() => toggleSplitMode('linke5')}
			>
				Die Linke über 5%
			</button>
			<button
				type="button"
				class="split-btn"
				class:active={splitMode === 'fdp5'}
				on:click={() => toggleSplitMode('fdp5')}
			>
				FDP über 8%
			</button>
			<button
				type="button"
				class="split-btn"
				class:active={splitMode === 'spdgruenelinke40'}
				on:click={() => toggleSplitMode('spdgruenelinke40')}
			>
				SPD + Grüne + Die Linke über 40%
			</button>
			<button
				type="button"
				class="split-btn"
				class:active={splitMode === 'cdu25'}
				on:click={() => toggleSplitMode('cdu25')}
			>
				CDU/CSU über 25%
			</button>
		{:else}
			<button
				type="button"
				class="case-button"
				class:active={activeCase === 'none'}
				on:click={() => selectCase('none')}
			>
				Alle
			</button>
			<button
				type="button"
				class="case-button"
				class:active={activeCase === 'bsw-below-5'}
				on:click={() => selectCase('bsw-below-5')}
			>
				BSW &lt; 5%
			</button>
		{/if}
	</div>

	{#if layoutMode === 'cluster'}
		<div class="phyllotaxis-wrap">
			<div class="viz-shell" style={`width: ${shellWidth}px;`}>
				{#if highlightLabelPosition}
					<div
						class="highlight-count"
						style={`left: ${labelGutter / 2}px; top: ${highlightLabelPosition.top}px;`}
						aria-hidden="true"
					>
						{highlightShareLabel}
					</div>
				{/if}
				<div class="phyllotaxis" style={`width: ${fieldSize}px; height: ${fieldSize}px;`}>
					{#if highlightClusterPath}
						<svg
							class="highlight-cluster"
							width={fieldSize}
							height={fieldSize}
							viewBox={`0 0 ${fieldSize} ${fieldSize}`}
							aria-hidden="true"
						>
							<path d={highlightClusterPath}></path>
						</svg>
					{/if}
					{#each laidOutDraws as draw (draw.id)}
						<div
							class="icon cluster-icon"
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
	{:else}
		<div class="viz-wrap" style={`width:${availableFieldSize}px; height:${vizHeight}px;`}>
			{#if splitMode !== 'none'}
				<div class="stack-title left">{leftTitle}</div>
				<div class="stack-title right">{rightTitle}</div>
			{/if}

			{#each laidOutDraws as draw (draw.drawNumber)}
				<div
					class="icon"
					style={`transform: translate(${draw.left}px, ${draw.top}px);`}
					role="button"
					tabindex="0"
					on:mouseenter={(event) => showTooltip(draw.parts, draw.drawNumber, null, event)}
					on:mousemove={moveTooltip}
					on:mouseleave={hideTooltip}
					on:focus={(event) =>
						showTooltipFromElement(draw.parts, draw.drawNumber, null, event.currentTarget)}
					on:blur={hideTooltip}
				>
					<DrawDonut parts={draw.parts} size={donutSize} inner={donutInner} />
				</div>
			{/each}
		</div>
	{/if}
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
	.split-btn {
		padding: 6px 10px;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		background: #fff;
		cursor: pointer;
		transition:
			background-color 180ms ease,
			border-color 180ms ease,
			transform 180ms ease,
			box-shadow 180ms ease;
	}
	.split-btn:hover {
		background: #f9fafb;
		box-shadow: 0 1px 4px rgba(17, 24, 39, 0.1);
	}
	.split-btn.active {
		background: #e5e7eb;
		border-color: #9ca3af;
		font-weight: 600;
		transform: translateY(-1px);
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
	.viz-wrap {
		position: relative;
		overflow: hidden;
		margin: 0 auto;
		transition: height 650ms cubic-bezier(0.2, 0.75, 0.2, 1);
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
	.highlight-cluster {
		position: absolute;
		inset: 0;
		overflow: visible;
		pointer-events: none;
	}
	.highlight-cluster path {
		fill: rgba(17, 17, 17, 0.14);
		stroke: rgba(17, 17, 17, 0.08);
		stroke-width: 1;
		filter: drop-shadow(0 18px 30px rgba(17, 17, 17, 0.08));
		transition: d 450ms ease;
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
	}
</style>
