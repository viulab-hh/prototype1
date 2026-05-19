<script>
	export let layoutMode = 'waffle';
	export let onChange = () => {};

	function choose(mode) {
		onChange(mode);
	}
</script>

<div class="layout-switch" role="group" aria-label="Layout selection">
	<span class="layout-label">View:</span>
	<button
		type="button"
		class="layout-btn"
		class:active={layoutMode === 'waffle'}
		on:click={() => choose('waffle')}
	>
		Waffle Layout
	</button>
	<button
		type="button"
		class="layout-btn"
		class:active={layoutMode === 'cluster'}
		on:click={() => choose('cluster')}
	>
		Cluster Layout
	</button>
</div>

<style>
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
</style>
