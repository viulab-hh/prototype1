<script>
	// This component displays an info box explaining the visualization (donuts)
</script>

<div class="infobox">
	<h2>What do the donuts mean?</h2>
	<p>
		The donuts show how the seats in the Bundestag could be distributed. Each circle represents one
		possible election result from the simulation. The colors match the parties.
	</p>
	<ul>
		<li>Each donut is a "draw" from the simulation.</li>
		<li>
			The donuts are sorted by certain criteria, for example by the number of seats of the largest
			party or by coalitions.
		</li>
		<li>This lets you see at a glance how different the results can be.</li>
	</ul>
	<p>
		The visualization helps you understand the uncertainty and range of possible election outcomes.
		The closer the donuts are together, the more likely that result is.
	</p>
</div>

<style>
	.infobox {
		background: #f8f9fa;
		border-left: 4px solid #0077cc;
		padding: 1.2em 1.5em;
		margin-bottom: 1.5em;
		border-radius: 6px;
		font-size: 1.05em;
		color: #222;
	}
</style>
