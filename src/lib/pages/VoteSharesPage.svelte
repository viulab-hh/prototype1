<script>
	import prediction from '$lib/data/bundestag_prediction_2026_simulation.json';
	import { getPartyLabel } from '$lib/constants/parties.js';

	const baseShares = prediction.vote_shares || {};
	const parties = Object.keys(baseShares);
	const editableParties = parties.filter((party) => party !== 'Others');

	function parseInitialShares() {
		const defaults = Object.fromEntries(
			editableParties.map((party) => [party, Number(baseShares[party]) || 0])
		);
		if (typeof window === 'undefined') return defaults;
		const encoded = new URLSearchParams(window.location.search).get('shares');
		if (!encoded) return defaults;
		try {
			const parsed = JSON.parse(encoded);
			for (const party of editableParties) {
				const value = Number(parsed?.[party]);
				defaults[party] = Number.isFinite(value) && value >= 0 ? value : defaults[party];
			}
		} catch {
			// Keep defaults when query decoding fails.
		}
		return defaults;
	}

	let values = parseInitialShares();
	let sumEditable = 0;
	let others = 0;
	let isOver100 = false;

	$: sumEditable = editableParties.reduce((sum, party) => sum + (Number(values[party]) || 0), 0);
	$: isOver100 = sumEditable > 100;
	$: others = Math.max(0, Number((100 - sumEditable).toFixed(2)));

	function updateValue(party, event) {
		const numeric = Number(event.currentTarget.value);
		values = {
			...values,
			[party]: Number.isFinite(numeric) && numeric >= 0 ? numeric : 0
		};
	}

	function submitVoteShares(event) {
		event.preventDefault();
		if (isOver100) return;

		const outgoing = {};
		for (const party of editableParties) {
			outgoing[party] = Number((Number(values[party]) || 0).toFixed(2));
		}
		outgoing.Others = others;

		if (typeof window !== 'undefined' && window.opener && !window.opener.closed) {
			window.opener.postMessage(
				{ type: 'vote-shares-submitted', voteShares: outgoing },
				window.location.origin
			);
			window.close();
		}
	}
</script>

<main>
	<h1>Adjust vote shares</h1>
	<p>"Others" is calculated automatically so the total always equals 100%.</p>

	<form on:submit={submitVoteShares}>
		{#each editableParties as party (party)}
			<label>
				<span>{getPartyLabel(party)}</span>
				<input
					type="number"
					step="0.1"
					min="0"
					max="100"
					value={values[party]}
					on:input={(event) => updateValue(party, event)}
				/>
			</label>
		{/each}

		<div class="others-row">
			<span>Others</span>
			<output>{others.toFixed(2)}%</output>
		</div>

		{#if isOver100}
			<p class="warning">The total is greater than 100%. Please reduce some values.</p>
		{/if}

		<button type="submit" disabled={isOver100}>Apply</button>
	</form>
</main>

<style>
	main {
		max-width: 420px;
		margin: 0 auto;
		padding: 1rem;
		font-family: sans-serif;
	}

	h1 {
		font-size: 1.3rem;
		margin: 0 0 0.3rem;
	}

	p {
		margin: 0 0 1rem;
		color: #334155;
	}

	form {
		display: grid;
		gap: 0.65rem;
	}

	label,
	.others-row {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		gap: 0.75rem;
	}

	input {
		width: 110px;
		padding: 0.35rem 0.45rem;
		border: 1px solid #cbd5e1;
		border-radius: 0.4rem;
		text-align: right;
	}

	.others-row {
		padding-top: 0.2rem;
		font-weight: 700;
		border-top: 1px solid #e2e8f0;
	}

	.warning {
		margin: 0.2rem 0;
		color: #b42318;
		font-weight: 600;
	}

	button {
		margin-top: 0.3rem;
		padding: 0.55rem 0.8rem;
		border: 1px solid #1d4ed8;
		border-radius: 0.5rem;
		background: #1d4ed8;
		color: #fff;
		font-weight: 700;
		cursor: pointer;
	}

	button:disabled {
		background: #94a3b8;
		border-color: #94a3b8;
		cursor: not-allowed;
	}
</style>
