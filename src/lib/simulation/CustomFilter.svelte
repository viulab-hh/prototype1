<script>
	import { getPartyShare } from '$lib/simulation/scenarios.js';
	import { getPartyLabel } from '$lib/constants/parties.js';

	export let parties = [];
	export let drawEntries = [];
	export let onChange = () => {};

	let selectedParty = '';
	let comparison = 'gte';
	let thresholdPct = 20;
	let isActive = false;

	// Set a sensible default party when the list first arrives
	$: if (parties.length && !selectedParty) selectedParty = parties[0];

	// Live match count, shown as a preview even before activating
	$: previewCount =
		selectedParty && drawEntries.length
			? drawEntries.filter(({ parts }) => {
					const share = getPartyShare(parts, selectedParty) * 100;
					return comparison === 'gte' ? share >= thresholdPct : share < thresholdPct;
				}).length
			: null;

	function buildConfig() {
		const arrow = comparison === 'gte' ? '≥' : '<';
		const reverseArrow = comparison === 'gte' ? '<' : '≥';
		const partyLabel = getPartyLabel(selectedParty);
		return {
			parties: [selectedParty],
			threshold: thresholdPct / 100,
			comparison,
			labelMatch: `${partyLabel} ${arrow} ${thresholdPct}%`,
			labelOther: `${partyLabel} ${reverseArrow} ${thresholdPct}%`,
			buttonLabel: `${partyLabel} ${arrow} ${thresholdPct}%`
		};
	}

	function activate() {
		isActive = true;
		onChange(buildConfig());
	}

	function clear() {
		isActive = false;
		onChange(null);
	}

	// Re-emit live when active so the visualisation updates immediately
	function onSettingChange() {
		if (isActive) onChange(buildConfig());
	}
</script>

<div class="custom-filter">
	<span class="label">Custom filter</span>

	<select bind:value={selectedParty} on:change={onSettingChange}>
		{#each parties as party (party)}
			<option value={party}>{getPartyLabel(party)}</option>
		{/each}
	</select>

	<div class="comparison-btns">
		<button
			type="button"
			class:selected={comparison === 'gte'}
			on:click={() => {
				comparison = 'gte';
				onSettingChange();
			}}>above</button
		>
		<button
			type="button"
			class:selected={comparison === 'lt'}
			on:click={() => {
				comparison = 'lt';
				onSettingChange();
			}}>below</button
		>
	</div>

	<input
		type="range"
		min="0"
		max="60"
		step="0.5"
		bind:value={thresholdPct}
		on:input={onSettingChange}
	/>
	<span class="threshold-val">{thresholdPct}%</span>

	{#if previewCount !== null}
		<span class="preview" class:zero={previewCount === 0}
			>{previewCount} / {drawEntries.length} matches</span
		>
	{/if}

	{#if isActive}
		<button type="button" class="action-btn clear-btn" on:click={clear}>× clear</button>
	{:else}
		<button type="button" class="action-btn apply-btn" on:click={activate}>Apply filter</button>
	{/if}
</div>

<style>
	.custom-filter {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		padding: 8px 0 4px;
		border-top: 1px solid #e5e7eb;
		margin-top: 4px;
		font-size: 0.875rem;
		font-family: sans-serif;
	}

	.label {
		font-weight: 700;
		color: #374151;
		white-space: nowrap;
	}

	select {
		padding: 4px 6px;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font: inherit;
	}

	.comparison-btns {
		display: flex;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		overflow: hidden;
	}

	.comparison-btns button {
		padding: 4px 10px;
		border: none;
		background: #f9fafb;
		cursor: pointer;
		font: inherit;
		font-size: 0.875rem;
	}

	.comparison-btns button.selected {
		background: #111827;
		color: #fff;
	}

	input[type='range'] {
		width: 130px;
		cursor: pointer;
	}

	.threshold-val {
		min-width: 38px;
		font-weight: 700;
	}

	.preview {
		padding: 2px 8px;
		border-radius: 999px;
		background: #dbeafe;
		color: #1d4ed8;
		font-weight: 600;
		font-size: 0.8rem;
		white-space: nowrap;
	}

	.preview.zero {
		background: #fee2e2;
		color: #b91c1c;
	}

	.action-btn {
		padding: 4px 12px;
		border-radius: 999px;
		cursor: pointer;
		font: inherit;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.apply-btn {
		border: 1px solid #6b7280;
		background: #f9fafb;
		color: #111827;
	}

	.apply-btn:hover {
		background: #f3f4f6;
	}

	.clear-btn {
		border: 1px solid #ef4444;
		background: #fef2f2;
		color: #b91c1c;
	}

	.clear-btn:hover {
		background: #fee2e2;
	}
</style>
