<script>
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	export let count = 50;
	let container;

	$: if (container) draw();

	function draw() {
		const width = 600;
		const height = 120;
		const margin = { top: 8, right: 8, bottom: 20, left: 8 };
		const data = d3.range(count).map(() => Math.random() * 100);

		// clear
		container.innerHTML = '';

		const svg = d3
			.select(container)
			.append('svg')
			.attr('viewBox', `0 0 ${width} ${height}`)
			.style('width', '100%')
			.style('height', 'auto');

		const x = d3
			.scaleBand()
			.domain(d3.range(data.length))
			.range([margin.left, width - margin.right])
			.padding(0.1);
		const y = d3
			.scaleLinear()
			.domain([0, d3.max(data)])
			.nice()
			.range([height - margin.bottom, margin.top]);

		svg
			.append('g')
			.selectAll('rect')
			.data(data)
			.join('rect')
			.attr('x', (_, i) => x(i))
			.attr('y', (d) => y(d))
			.attr('width', x.bandwidth())
			.attr('height', (d) => Math.max(0, y(0) - y(d)))
			.attr('fill', '#2563EB');

		svg
			.append('g')
			.attr('transform', `translate(0,${height - margin.bottom})`)
			.call(d3.axisBottom(x).tickFormat(''));

		svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(3));
	}

	onMount(() => draw());
</script>

<div bind:this={container} class="chart"></div>

<style>
	.chart {
		width: 100%;
		max-width: 720px;
		margin-top: 16px;
	}
</style>
