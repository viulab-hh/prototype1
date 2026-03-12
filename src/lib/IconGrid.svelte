<script>
	import DrawDonut from '$lib/DrawDonut.svelte';
	import prediction from '$lib/data/bundestag_prediction_2026_simulation.json';

	let donutCount = '50';
	const simulationSampleSize = prediction.statistical?.sample_size ?? 1500;

	const parties = Object.keys(prediction.vote_shares || {});
	const baseShares = parties.map((party) => prediction.vote_shares[party] || 0);
	const totalShare = baseShares.reduce((sum, value) => sum + value, 0) || 100;
	const probabilities = baseShares.map((value) => value / totalShare);

	let draws = [];

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
			value: counts[index] / total
		}));
	}

	$: {
		const count = Math.max(1, +donutCount);
		draws = Array.from({ length: count }, () => buildDraw());
	}
</script>

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

<div class="grid">
	{#each draws as parts}
		<div class="icon">
			<DrawDonut {parts} size={124} inner={38} />
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
		grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
		gap: 12px;
		align-items: center;
	}
	.icon {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 10px 8px;
		border: 1px solid #e5e7eb;
		border-radius: 10px;
		background: #fff;
	}
</style>
