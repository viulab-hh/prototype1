<script>
	import DrawDonut from '$lib/DrawDonut.svelte';
	import SimulationTooltip from '$lib/SimulationTooltip.svelte';
	import LayoutSwitch from '$lib/iconGrid/LayoutSwitch.svelte';
	import ScenarioControls from '$lib/iconGrid/ScenarioControls.svelte';
	import {
		scenarioConfigs,
		matchesScenario,
		getMaximumPartyShare,
		partitionScenarioDraws
	} from '$lib/iconGrid/scenarios.js';
	import {
		createSimulationInputs,
		buildDraw,
		buildMinimumShares
	} from '$lib/iconGrid/simulation.js';
	import { buildPhyllotaxisView, getWafflePosition } from '$lib/iconGrid/layout.js';
	import prediction from '$lib/data/bundestag_prediction_2026_simulation.json';
	import { flip } from 'svelte/animate';
	import { SvelteMap } from 'svelte/reactivity';

	let donutCount = '200';
	let layoutMode = 'waffle';
	let scenarioMode = 'none';
	const { parties, probabilities, simulationSampleSize } = createSimulationInputs(prediction);
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

	function setLayoutMode(mode) {
		layoutMode = mode;
		hideTooltip();
	}

	function toggleScenario(mode) {
		scenarioMode = scenarioMode === mode ? 'none' : mode;
		hideTooltip();
	}

	function setDonutCount(value) {
		donutCount = value;
		hideTooltip();
	}

	const minimumShares = buildMinimumShares(
		parties,
		Array.from({ length: 5000 }, () => buildDraw(simulationSampleSize, probabilities, parties))
	);

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
		const sharedFieldSize = Math.max(
			220,
			Math.min(viewportWidth - viewportPadding, viewportHeight - verticalReserve)
		);
		if (sampledDraws.length !== count) {
			sampledDraws = Array.from({ length: count }, () =>
				buildDraw(simulationSampleSize, probabilities, parties)
			);
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
			const phyllotaxisView = buildPhyllotaxisView({
				count,
				fieldLimit: availableFieldSize,
				minDonutSize,
				maxDonutSize
			});
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
			const scenarioPartition = partitionScenarioDraws(drawEntries, scenarioMode, scenarioConfigs);
			scenarioHeader = scenarioPartition.header;
			const phyllotaxisView = buildPhyllotaxisView({
				count,
				fieldLimit: availableFieldSize,
				minDonutSize,
				maxDonutSize
			});
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
				const pos = getWafflePosition(index, splitCols, donutSize, waffleGap, splitHeaderHeight);
				splitPositions.set(draw.drawNumber, { left: pos.x, top: pos.y });
			});
			scenarioPartition.other.forEach((draw, index) => {
				const pos = getWafflePosition(index, splitCols, donutSize, waffleGap, splitHeaderHeight);
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
	<LayoutSwitch {layoutMode} on:change={(event) => setLayoutMode(event.detail.mode)} />

	<ScenarioControls
		{donutCount}
		{scenarioMode}
		{scenarioConfigs}
		on:countchange={(event) => setDonutCount(event.detail.value)}
		on:scenariochange={(event) => toggleScenario(event.detail.mode)}
	/>

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
