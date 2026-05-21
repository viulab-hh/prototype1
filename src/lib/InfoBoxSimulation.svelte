<script>
	// This component displays an info box explaining how the simulation works
</script>

<div class="infobox">
	<h2>How does the simulation work?</h2>

	<h3>Data Source</h3>
	<p>
		The simulation uses polling data as its input. In this demo, the numbers are synthetic and for
		demonstration only. In a real scenario, the poll results would come from published opinion
		polls, and the sample size (e.g., 1,500 respondents) determines the statistical uncertainty.
	</p>

	<h3>Simulation Steps</h3>
	<ol>
		<li>
			<b>Assign probability distributions:</b> For each party, the reported poll percentage is
			treated as the mean of a probability distribution (typically a normal distribution). The
			standard error is calculated from the poll’s sample size: <br />
			<span style="font-family:monospace">SE = sqrt(p × (1-p) / n)</span>, where
			<span style="font-family:monospace">p</span>
			is the party’s share (as a fraction) and <span style="font-family:monospace">n</span> is the sample
			size.
		</li>
		<li>
			<b>Draw random samples:</b> For each simulation run, a random value for each party’s vote share
			is drawn from its probability distribution. This models the uncertainty in the poll.
		</li>
		<li>
			<b>Apply the 5% threshold:</b> Only parties with a simulated vote share of at least 5% are considered
			for seat allocation. Others are excluded.
		</li>
		<li>
			<b>Allocate seats:</b> The valid vote shares are converted into seats using proportional allocation
			(e.g., Sainte-Laguë/Schepers method), rounding as needed to match the total number of seats (e.g.,
			598).
		</li>
		<li>
			<b>Repeat:</b> Steps 2–4 are repeated many times (e.g., 10,000 runs). Each run is one possible election
			outcome.
		</li>
		<li>
			<b>Summarize results:</b> For each party and coalition, the simulation counts how often each outcome
			occurs (e.g., number of seats, majority status). This produces probability estimates and distributions.
		</li>
	</ol>

	<h3>Confidence Intervals</h3>
	<p>
		For each party, the simulation reports a <b>confidence interval</b> for the number of seats (e.g.,
		the 95% interval). This is the range between the 2.5th and 97.5th percentile of the simulated seat
		counts. If the interval for a party is [158, 189], it means that in 95% of simulation runs, the party
		received between 158 and 189 seats.
	</p>

	<h3>Interpretation</h3>
	<p>
		The simulation does not predict a single result. Instead, it shows the range and likelihood of
		all possible outcomes, based on current poll data and statistical uncertainty.
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
