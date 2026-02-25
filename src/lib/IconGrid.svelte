<script>
	import Donut from '$lib/Donut.svelte';
	import MonteDonut from '$lib/MonteDonut.svelte';
	import prediction from '$lib/data/bundestag_prediction_2026_simulation.json';

	// sample-size used for computing standard errors
	let sampleSize = '50';

	// derive parties from the prediction file (use party_stats keys)
	const partyStats = prediction.statistical && prediction.statistical.party_stats ? prediction.statistical.party_stats : {};
	let parties = Object.keys(partyStats);
	let samples = [];

	// palette
	const colors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#8B5CF6'];

	function handleChange(e) {
		sampleSize = e.target.value;
	}

	function normalRandom(){
		// Box-Muller transform
		let u = 0, v = 0;
		while(u === 0) u = Math.random();
		while(v === 0) v = Math.random();
		return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
	}

	// recompute samples when parties or sampleSize changes
	$: {
		const n = Math.max(1, +sampleSize);
		samples = parties.map((p) => {
			const stat = partyStats[p];
			const mean = stat && stat.share ? stat.share : 0;
			const pprop = mean / 100;
			const sd_pct = Math.sqrt(pprop * (1 - pprop) / n) * 100; // percentage points
			const draw = Math.max(0, Math.min(100, mean + sd_pct * normalRandom()));
			return { party: p, mean, sd_pct, draw, donutValue: draw / 100 };
		});
	}
</script>

<div class="controls">
	<label for="count-select">Sample size:</label>
	<select id="count-select" on:change={handleChange} bind:value={sampleSize}>
		<option value="50">50</option>
		<option value="100">100</option>
		<option value="200">200</option>
		<option value="500">500</option>
	</select>
	<div class="summary">Using sample size: {sampleSize}</div>
</div>

<div>
	<MonteDonut voteShares={prediction.vote_shares} sampleSize={sampleSize} sims={1000} />
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
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 12px;
		align-items: center;
	}
	.icon {
		display: flex;
		gap: 8px;
		align-items: center;
		padding: 8px;
		border-radius: 8px;
		background: #fff;
		box-shadow: 0 1px 2px rgba(0,0,0,0.04);
	}
	.label .party { font-weight: 600; font-size: 0.9rem }
	.label .meta { font-size: 0.8rem; color: #6b7280 }
</style>
