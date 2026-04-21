<script>
	export let parts = [];
	export let drawNumber = null;
	export let x = 0;
	export let y = 0;
	export let referenceMinimums = {};

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

	const partyLabels = {
		Greens: 'Grüne',
		Others: 'Sonstige'
	};

	function getPartyColor(party) {
		return partyColors[party] || '#9CA3AF';
	}

	function getPartyLabel(party) {
		return partyLabels[party] || party;
	}

	function getMinimumShare(party) {
		return referenceMinimums?.[party] ?? 0;
	}

	function formatDifferenceToMinimum(party, value) {
		return `+${((value - getMinimumShare(party)) * 100).toFixed(2)} pp zu Minimum`;
	}
</script>

{#if parts && parts.length}
	<div class="tooltip" style={`left: ${x}px; top: ${y}px;`}>
		<div class="tooltip-header">Simulationsziehung {drawNumber}</div>
		{#each parts as part (part.party)}
			<div class="tooltip-row">
				<div class="row-main">
					<span class="party-wrap">
						<span class="party-dot" style={`background-color: ${getPartyColor(part.party)};`}
						></span>
						<span class="party">{getPartyLabel(part.party)}</span>
					</span>
					<span>{(part.value * 100).toFixed(2)}%</span>
				</div>
				<div class="row-sub">
					<span>Minimum {(getMinimumShare(part.party) * 100).toFixed(2)}%</span>
					<span class="delta-up">{formatDifferenceToMinimum(part.party, part.value)}</span>
				</div>
			</div>
		{/each}
	</div>
{/if}

<style>
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
		display: grid;
		gap: 2px;
		padding: 2px 0;
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
	.row-main,
	.row-sub {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
	}
	.row-sub {
		color: #6b7280;
		font-size: 0.7rem;
	}
	.delta-up {
		color: #166534;
		font-weight: 700;
	}
</style>
