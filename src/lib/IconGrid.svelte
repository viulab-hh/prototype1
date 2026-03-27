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
	let linkeAtLeastFiveDraws = [];
	let linkeBelowFiveDraws = [];
	let rotGruenLinkeAtLeastFortyDraws = [];
	let rotGruenLinkeBelowFortyDraws = [];
	let fdpAtLeastFiveDraws = [];
	let fdpBelowFiveDraws = [];
	let cduAtLeastTwentyFiveDraws = [];
	let cduBelowTwentyFiveDraws = [];
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
	let splitMode = 'none';
	let tooltipParts = null;
	let tooltipDrawNumber = null;
	let tooltipX = 0;
	let tooltipY = 0;

	function handleChange(e) {
		donutCount = e.target.value;
	}

	function toggleSplitMode(mode) {
		splitMode = splitMode === mode ? 'none' : mode;
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

	function getLinkeShare(parts) {
		return parts.find((part) => part.party === 'Die Linke')?.value || 0;
	}

	function getRotGruenLinkeShare(parts) {
		const spd = parts.find((part) => part.party === 'SPD')?.value || 0;
		const gruene = parts.find((part) => part.party === 'Greens')?.value || 0;
		const linke = parts.find((part) => part.party === 'Die Linke')?.value || 0;
		return spd + gruene + linke;
	}

	function getFdpShare(parts) {
		return parts.find((part) => part.party === 'FDP')?.value || 0;
	}

	function getCduShare(parts) {
		return parts.find((part) => part.party === 'CDU/CSU')?.value || 0;
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
		draws = Array.from({ length: count }, () => buildDraw());
		drawEntries = draws.map((parts, index) => ({
			parts,
			drawNumber: index + 1,
			linkeShare: getLinkeShare(parts),
			fdpShare: getFdpShare(parts),
			rotGruenLinkeShare: getRotGruenLinkeShare(parts),
			cduShare: getCduShare(parts)
		}));

		linkeAtLeastFiveDraws = drawEntries.filter((draw) => draw.linkeShare >= 0.05);
		linkeBelowFiveDraws = drawEntries.filter((draw) => draw.linkeShare < 0.05);
		fdpAtLeastFiveDraws = drawEntries.filter((draw) => draw.fdpShare >= 0.08);
		fdpBelowFiveDraws = drawEntries.filter((draw) => draw.fdpShare < 0.08);
		rotGruenLinkeAtLeastFortyDraws = drawEntries.filter((draw) => draw.rotGruenLinkeShare >= 0.4);
		rotGruenLinkeBelowFortyDraws = drawEntries.filter((draw) => draw.rotGruenLinkeShare < 0.4);
		cduAtLeastTwentyFiveDraws = drawEntries.filter((draw) => draw.cduShare >= 0.25);
		cduBelowTwentyFiveDraws = drawEntries.filter((draw) => draw.cduShare < 0.25);

		if (splitMode === 'linke5') {
			activeLeftDraws = linkeAtLeastFiveDraws;
			activeRightDraws = linkeBelowFiveDraws;
			leftTitle = `Die Linke ≥ 5% (${activeLeftDraws.length})`;
			rightTitle = `Die Linke < 5% (${activeRightDraws.length})`;
		} else if (splitMode === 'fdp5') {
			activeLeftDraws = fdpAtLeastFiveDraws;
			activeRightDraws = fdpBelowFiveDraws;
			leftTitle = `FDP ≥ 8% (${activeLeftDraws.length})`;
			rightTitle = `FDP < 8% (${activeRightDraws.length})`;
		} else if (splitMode === 'spdgruenelinke40') {
			activeLeftDraws = rotGruenLinkeAtLeastFortyDraws;
			activeRightDraws = rotGruenLinkeBelowFortyDraws;
			leftTitle = `SPD + Grüne + Die Linke ≥ 40% (${activeLeftDraws.length})`;
			rightTitle = `SPD + Grüne + Die Linke < 40% (${activeRightDraws.length})`;
		} else if (splitMode === 'cdu25') {
			activeLeftDraws = cduAtLeastTwentyFiveDraws;
			activeRightDraws = cduBelowTwentyFiveDraws;
			leftTitle = `CDU/CSU ≥ 25% (${activeLeftDraws.length})`;
			rightTitle = `CDU/CSU < 25% (${activeRightDraws.length})`;
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
		const phyllotaxisPositions = new Map(
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

		const splitPositions = new Map();
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
				top: activePos?.top ?? 0
			};
		});
	}
</script>

<svelte:window bind:innerWidth={viewportWidth} bind:innerHeight={viewportHeight} />

<div class="icon-grid">
	<div class="controls">
		<label for="count-select">Anzahl Ziehnungen:</label>
		<select id="count-select" on:change={handleChange} bind:value={donutCount}>
			<option value="50">50</option>
			<option value="100">100</option>
			<option value="200">200</option>
			<option value="500">500</option>
		</select>
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
	</div>

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
				on:mouseenter={(event) => showTooltip(draw.parts, draw.drawNumber, event)}
				on:mousemove={moveTooltip}
				on:mouseleave={hideTooltip}
				on:focus={(event) =>
					showTooltipFromElement(draw.parts, draw.drawNumber, event.currentTarget)}
				on:blur={hideTooltip}
			>
				<DrawDonut parts={draw.parts} size={donutSize} inner={donutInner} />
			</div>
		{/each}
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
	.icon {
		position: absolute;
		left: 0;
		top: 0;
		transition: transform 650ms cubic-bezier(0.2, 0.75, 0.2, 1);
	}
</style>
