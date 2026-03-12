<script>
	import DrawDonut from '$lib/DrawDonut.svelte';
	import prediction from '$lib/data/bundestag_prediction_2026_simulation.json';

	let donutCount = '200';
	const simulationSampleSize = prediction.statistical?.sample_size ?? 1500;

	const parties = Object.keys(prediction.vote_shares || {});
	const baseShares = parties.map((party) => prediction.vote_shares[party] || 0);
	const totalShare = baseShares.reduce((sum, value) => sum + value, 0) || 100;
	const probabilities = baseShares.map((value) => value / totalShare);
	const goldenAngle = Math.PI * (3 - Math.sqrt(5));
	const partyColors = {
		'CDU/CSU': '#111111',
		SPD: '#E3000F',
		Greens: '#64A12D',
		AfD: '#009EE0',
		FDP: '#FFED00',
		BSW: '#6E2C91',
		'Die Linke': '#BE3075',
		Others: '#9CA3AF'
	};
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

	function getPartyColor(party) {
		return partyColors[party] || '#9CA3AF';
	}

	function getPartyLabel(party) {
		const labels = {
			Greens: 'Grüne',
			Others: 'Sonstige'
		};
		return labels[party] || party;
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
		const availableFieldSize = Math.max(
			220,
			Math.min(viewportWidth - viewportPadding, viewportHeight - verticalReserve)
		);

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
		const maxUnitRadius = unitPositions.reduce(
			(max, pos) => Math.max(max, Math.hypot(pos.x, pos.y)),
			0
		);

		const k =
			minUnitDistance > 0 && Number.isFinite(minUnitDistance)
				? (2 * maxUnitRadius) / minUnitDistance
				: 1;
		const fittedSize = Math.floor((availableFieldSize - (k + 4)) / (k + 1));
		donutSize = Math.max(minDonutSize, Math.min(maxDonutSize, fittedSize));
		donutInner = Math.max(4, Math.round(donutSize * 0.29));

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
		fieldSize = Math.min(availableFieldSize, Math.max(donutSize + 10, Math.ceil(maxRadius * 2)));

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

	<div class="sunflower-wrap">
		<div class="sunflower" style={`width: ${fieldSize}px; height: ${fieldSize}px;`}>
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

{#if tooltipParts}
	<div class="tooltip" style={`left: ${tooltipX}px; top: ${tooltipY}px;`}>
		<div class="tooltip-header">Simulationsziehung {tooltipDrawNumber}</div>
		{#each tooltipParts as part}
			<div class="tooltip-row">
				<span class="party-wrap">
					<span class="party-dot" style={`background-color: ${getPartyColor(part.party)};`}></span>
					<span class="party">{getPartyLabel(part.party)}</span>
				</span>
				<span>{(part.value * 100).toFixed(2)}%</span>
			</div>
		{/each}
	</div>
{/if}

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

	.sunflower-wrap {
		width: 100%;
		overflow: hidden;
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
	.tooltip {
		position: fixed;
		z-index: 50;
		pointer-events: none;
		background: #ffffff;
		color: #111827;
		padding: 8px 10px;
		border-radius: 8px;
		font-size: 0.78rem;
		line-height: 1.35;
		border: 1px solid #e5e7eb;
		box-shadow: 0 8px 18px rgba(17, 24, 39, 0.12);
		min-width: 170px;
	}
	.tooltip-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
	}
	.tooltip-header {
		font-weight: 700;
		margin-bottom: 6px;
	}
	.party-wrap {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.party-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.party {
		font-weight: 600;
	}
</style>
