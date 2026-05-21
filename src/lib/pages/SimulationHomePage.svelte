<script>
	import Simulation from '$lib/Simulation.svelte';
	import InfoBoxSimulation from '$lib/InfoBoxSimulation.svelte';
	import InfoBoxVisualization from '$lib/InfoBoxVisualization.svelte';
	let showInfo = false;
	let showVisualizationInfo = false;
</script>

<h1>Visualization of possible election outcomes</h1>
<p>All outcomes are generated from the same poll.</p>

<button on:click={() => (showInfo = !showInfo)} style="margin-bottom:0.5em">
	{showInfo ? 'Hide simulation info' : 'Simulation info'}
</button>
{#if showInfo}
	<InfoBoxSimulation />
{/if}

<button on:click={() => (showVisualizationInfo = !showVisualizationInfo)} style="margin-bottom:1em">
	{showVisualizationInfo ? 'Hide visualization info' : 'Visualization info'}
</button>
{#if showVisualizationInfo}
	<InfoBoxVisualization />
{/if}

<Simulation />
