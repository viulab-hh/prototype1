<script>
	export let donutCount = '200';
	export let scenarioMode = 'none';
	export let scenarioConfigs = {};
	export let matchCounts = {};
	export let onCountChange = () => {};
	export let onScenarioChange = () => {};

	function handleCountChange(event) {
		onCountChange(event.currentTarget.value);
	}

	function handleScenarioClick(mode) {
		onScenarioChange(mode);
	}
</script>

<div class="controls">
	<label for="count-select">Anzahl Ziehungen:</label>
	<select id="count-select" value={donutCount} on:change={handleCountChange}>
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
		on:click={() => handleScenarioClick('none')}
	>
		Alle
	</button>
	{#each Object.entries(scenarioConfigs) as [scenarioKey, cfg] (scenarioKey)}
		<button
			type="button"
			class="case-button"
			class:active={scenarioMode === scenarioKey}
			class:no-match={matchCounts[scenarioKey] === 0}
			on:click={() => handleScenarioClick(scenarioKey)}
		>
			{cfg.buttonLabel}
		</button>
	{/each}
</div>

<style>
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

	.case-button.no-match {
		opacity: 0.6;
	}
</style>
