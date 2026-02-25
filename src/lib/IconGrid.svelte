<script>
	import { onMount } from 'svelte';
	let count = 50;
	let items = [];

	$: items = Array.from({ length: count }, (_, i) => i + 1);

	// optional: generate a list of colors for variety
	const colors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

	function handleChange(e) {
		count = +e.target.value;
	}
</script>

<div class="controls">
	<label for="count-select">Icons:</label>
	<select id="count-select" on:change={handleChange} bind:value={count}>
		<option value="50">50</option>
		<option value="100">100</option>
		<option value="200">200</option>
		<option value="500">500</option>
	</select>
	<div class="summary">Showing {count} icons</div>
</div>

<div class="grid" role="list" aria-label="icons grid">
	{#each items as i (i)}
		<div
			class="icon"
			role="listitem"
			title={`Icon ${i}`}
			style={`background: ${colors[i % colors.length]}`}
		>
			<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
				<path
					fill="white"
					d="M12 2l2.9 6.3L21 9.2l-5 3.8L17 21l-5-3.3L7 21l1-8.1L3 9.2l6.1-.9L12 2z"
				/>
			</svg>
		</div>
	{/each}
</div>

<style>
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

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
		gap: 8px;
	}
	.icon {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
		box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05) inset;
		transition: transform 0.12s ease;
	}
	.icon:active {
		transform: scale(0.96);
	}
</style>
