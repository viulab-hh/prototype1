<script>
	import SimulationTooltip from '$lib/SimulationTooltip.svelte';
	import SimulationLayout from '$lib/simulation/SimulationLayout.svelte';
	import LayoutSwitch from '$lib/simulation/LayoutSwitch.svelte';
	import ScenarioControls from '$lib/simulation/ScenarioControls.svelte';
	import CustomFilter from '$lib/simulation/CustomFilter.svelte';
	import {
		scenarioConfigs,
		matchesScenario,
		getMaximumPartyShare,
		partitionScenarioDraws,
		computeMatchCounts
	} from '$lib/simulation/scenarios.js';
	import {
		createSimulationInputs,
		buildDraw,
		buildMinimumShares,
		recalculateOthers
	} from '$lib/simulation/simulation.js';
	import {
		buildPhyllotaxisView,
		getWafflePosition,
		sortClusterDraws,
		calculateHighlightInfo
	} from '$lib/simulation/layout.js';
	import {
		MAX_DONUT_SIZE,
		MIN_DONUT_SIZE,
		VIEWPORT_PADDING,
		VERTICAL_RESERVE,
		WAFFLE_GAP,
		SPLIT_GAP,
		SPLIT_HEADER_HEIGHT,
		SIMULATION_SAMPLE_COUNT
	} from '$lib/constants/layout.js';
	import prediction from '$lib/data/bundestag_prediction_2026_simulation.json';
	import { SvelteMap } from 'svelte/reactivity';

	let donutCount = '200';
	let layoutMode = 'cluster';
	let scenarioMode = 'none';
	let voteShares = { ...(prediction.vote_shares || {}) };
	let parties = [];
	let probabilities = [];
	let simulationSampleSize = 1500;
	$: ({ parties, probabilities, simulationSampleSize } = createSimulationInputs({
		...prediction,
		vote_shares: voteShares
	}));
	const maxDonutSize = MAX_DONUT_SIZE;
	const minDonutSize = MIN_DONUT_SIZE;
	const viewportPadding = VIEWPORT_PADDING;
	const verticalReserve = VERTICAL_RESERVE;
	const waffleGap = WAFFLE_GAP;
	const splitGap = SPLIT_GAP;
	const splitHeaderHeight = SPLIT_HEADER_HEIGHT;

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
	let minimumShares = {};
	let probabilityKey = '';
	let lastProbabilityKey = '';
	let customConfig = null;

	$: activeScenarioConfigs = customConfig
		? { ...scenarioConfigs, custom: customConfig }
		: scenarioConfigs;
	$: matchCounts = computeMatchCounts(drawEntries, activeScenarioConfigs);
	$: probabilityKey = probabilities.map((value) => value.toFixed(6)).join('|');
	$: minimumShares = buildMinimumShares(
		parties,
		Array.from({ length: SIMULATION_SAMPLE_COUNT }, () =>
			buildDraw(simulationSampleSize, probabilities, parties)
		)
	);

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

	function openVoteShareForm() {
		if (typeof window === 'undefined') return;
		const params = new URLSearchParams({
			shares: JSON.stringify(voteShares)
		});
		window.open(
			`/vote-shares?${params.toString()}`,
			'vote-share-form',
			'popup=yes,width=480,height=760,resizable=yes,scrollbars=yes'
		);
	}

	function handleVoteShareMessage(event) {
		if (typeof window === 'undefined') return;
		if (event.origin !== window.location.origin) return;
		if (event.data?.type !== 'vote-shares-submitted') return;

		const incoming = event.data.voteShares;
		if (!incoming || typeof incoming !== 'object') return;

		const knownParties = Object.keys(prediction.vote_shares || {});
		let nextShares = {};
		for (const party of knownParties) {
			const numeric = Number(incoming[party]);
			nextShares[party] = Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
		}

		if ('Others' in nextShares) {
			nextShares = recalculateOthers(nextShares);
		}

		voteShares = nextShares;
		sampledDraws = [];
		lastProbabilityKey = '';
		hideTooltip();
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

	function handleCustomFilter(event) {
		const cfg = event.detail.config;
		customConfig = cfg || null;
		if (cfg) {
			scenarioMode = 'custom';
		} else if (scenarioMode === 'custom') {
			scenarioMode = 'none';
		}
		hideTooltip();
	}

	$: {
		const count = Math.max(1, +donutCount);
		const sharedFieldSize = Math.max(
			220,
			Math.min(viewportWidth - viewportPadding, viewportHeight - verticalReserve)
		);
		if (sampledDraws.length !== count || lastProbabilityKey !== probabilityKey) {
			sampledDraws = Array.from({ length: count }, () =>
				buildDraw(simulationSampleSize, probabilities, parties)
			);
			lastProbabilityKey = probabilityKey;
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
				isHighlighted: matchesScenario(draw.parts, scenarioMode, activeScenarioConfigs)
			}));

			const clusteredDraws =
				scenarioMode === 'none'
					? [...decoratedDraws].sort(
							(a, b) => getMaximumPartyShare(b.parts) - getMaximumPartyShare(a.parts) || a.id - b.id
						)
					: sortClusterDraws(decoratedDraws, scenarioMode, getMaximumPartyShare, (parts, mode) =>
							matchesScenario(parts, mode, activeScenarioConfigs)
						);

			laidOutDraws = clusteredDraws.map((draw, index) => {
				const pos = phyllotaxisView.layout.items[index];
				return {
					...draw,
					left: pos.left + phyllotaxisView.phyllotaxisOffsetX,
					top: pos.top
				};
			});

			const {
				highlightShareLabel: newHighlightShareLabel,
				highlightLabelPosition: newHighlightLabelPosition
			} = calculateHighlightInfo(laidOutDraws, donutSize, clusterDraws);
			highlightShareLabel = newHighlightShareLabel;
			highlightLabelPosition = newHighlightLabelPosition;
			scenarioHeader = { left: '', right: '' };
		} else {
			availableFieldSize = sharedFieldSize;
			const scenarioPartition = partitionScenarioDraws(
				drawEntries,
				scenarioMode,
				activeScenarioConfigs
			);
			scenarioHeader = scenarioPartition.header;

			// Compute a good donut size from phyllotaxis helper (scales with count)
			const phyllotaxisView = buildPhyllotaxisView({
				count,
				fieldLimit: availableFieldSize,
				minDonutSize,
				maxDonutSize
			});
			donutSize = phyllotaxisView.donutSize;
			donutInner = phyllotaxisView.donutInner;
			fieldSize = phyllotaxisView.fieldSize;

			if (scenarioMode === 'none') {
				// Simple full-width matrix grid, sorted by dominant party share (same order as cluster)
				const gridCols = Math.max(
					1,
					Math.floor((availableFieldSize + waffleGap) / (donutSize + waffleGap))
				);
				const gridRows = Math.ceil(count / gridCols);
				vizHeight = gridRows * (donutSize + waffleGap) - waffleGap;

				const sortedEntries = [...drawEntries].sort(
					(a, b) => getMaximumPartyShare(b.parts) - getMaximumPartyShare(a.parts)
				);

				laidOutDraws = sortedEntries.map((draw, index) => {
					const pos = getWafflePosition(index, gridCols, donutSize, waffleGap, 0);
					return {
						parts: draw.parts,
						drawNumber: draw.drawNumber,
						left: pos.x,
						top: pos.y,
						groupSize: null
					};
				});
			} else {
				// Scenario split: two columns
				const stackWidth = Math.max(80, Math.floor((availableFieldSize - splitGap) / 2));
				const splitCols = Math.max(
					1,
					Math.floor((stackWidth + waffleGap) / (donutSize + waffleGap))
				);

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
				const rightStackHeight =
					splitHeaderHeight + rightRows * (donutSize + waffleGap) - waffleGap;
				vizHeight = Math.max(splitHeaderHeight, leftStackHeight, rightStackHeight);

				laidOutDraws = drawEntries.map((draw) => {
					const pos = splitPositions.get(draw.drawNumber);
					return {
						parts: draw.parts,
						drawNumber: draw.drawNumber,
						left: pos?.left ?? 0,
						top: pos?.top ?? 0,
						groupSize: null
					};
				});
			}

			highlightShareLabel = '';
			highlightLabelPosition = null;
		}
	}
</script>

<svelte:window
	bind:innerWidth={viewportWidth}
	bind:innerHeight={viewportHeight}
	on:message={handleVoteShareMessage}
/>

<div class="icon-grid">
	<button type="button" class="customize-shares" on:click={openVoteShareForm}>
		Eigene Stimmenanteile eingeben
	</button>

	<LayoutSwitch {layoutMode} on:change={(event) => setLayoutMode(event.detail.mode)} />

	<ScenarioControls
		{donutCount}
		{scenarioMode}
		scenarioConfigs={activeScenarioConfigs}
		{matchCounts}
		on:countchange={(event) => setDonutCount(event.detail.value)}
		on:scenariochange={(event) => toggleScenario(event.detail.mode)}
	/>

	<CustomFilter {parties} {drawEntries} on:change={handleCustomFilter} />

	<SimulationLayout
		{layoutMode}
		{scenarioMode}
		{availableFieldSize}
		{fieldSize}
		{vizHeight}
		{highlightLabelPosition}
		{clusterLabelAnchorX}
		{highlightShareLabel}
		{scenarioHeader}
		{laidOutDraws}
		{donutSize}
		{donutInner}
		{minimumShares}
		onIconEnter={showTooltip}
		onIconMove={moveTooltip}
		onIconLeave={hideTooltip}
		onIconFocus={showTooltipFromElement}
		onIconBlur={hideTooltip}
	/>
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

	.customize-shares {
		margin: 0 0 0.8rem;
		padding: 0.5rem 0.9rem;
		border-radius: 0.5rem;
		border: 1px solid #d0d7de;
		background: #f5f8fb;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
	}

	.customize-shares:hover {
		background: #eaf1f8;
	}
</style>
