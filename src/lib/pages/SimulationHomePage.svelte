
<script>
	import Simulation from '$lib/Simulation.svelte';
	import InfoBoxSimulation from '$lib/InfoBoxSimulation.svelte';
	let showInfo = false;
</script>

<h1>Visualization of possible election outcomes</h1>
<p>All outcomes are generated from the same poll.</p>

<button on:click={() => showInfo = !showInfo} style="margin-bottom:1em">
	{showInfo ? 'Hide explanation' : 'How does this work?'}
</button>
{#if showInfo}
	<InfoBoxSimulation />
{/if}

<Simulation />
