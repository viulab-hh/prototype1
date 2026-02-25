<script>
	import * as d3 from 'd3';
	export let value = Math.random(); // 0..1
	export let size = 36;
	export let thickness = 8;
	export let color = '#2563EB';
	export let bgColor = '#e6e6e6';

	const radius = size / 2;
	const inner = Math.max(0, radius - thickness);

	$: arc = d3.arc().innerRadius(inner).outerRadius(radius);
	$: fullPath = arc({ startAngle: 0, endAngle: 2 * Math.PI });
	$: valuePath = arc({ startAngle: 0, endAngle: Math.max(0, Math.min(1, value)) * 2 * Math.PI });
</script>

<svg width={size} height={size} viewBox="0 0 {size} {size}" aria-hidden="true" focusable="false">
	<g transform="translate({radius},{radius})">
		<path d={fullPath} fill={bgColor} />
		<path d={valuePath} fill={color} />
	</g>
</svg>

<style>
	svg {
		display: block;
	}
</style>
