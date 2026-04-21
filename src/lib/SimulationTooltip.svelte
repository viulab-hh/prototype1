<script>
	export let parts = [];
	export let drawNumber = null;
	export let groupSize = null;
	export let x = 0;
	export let y = 0;

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
</script>

{#if parts && parts.length}
	<div class="tooltip" style={`left: ${x}px; top: ${y}px;`}>
		<div class="tooltip-header">Gruppe {drawNumber}</div>
		{#if groupSize}
			<div class="tooltip-subheader">repräsentiert {groupSize} Simulationen</div>
		{/if}
		{#each parts as part}
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
		margin-bottom: 2px;
	}
	.tooltip-subheader {
		color: #6b7280;
		font-size: 0.72rem;
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
