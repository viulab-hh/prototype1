<script>
	import { flip } from 'svelte/animate';
	import DrawDonut from '$lib/DrawDonut.svelte';

	export let layoutMode = 'waffle';
	export let scenarioMode = 'none';
	export let availableFieldSize = 220;
	export let fieldSize = 220;
	export let vizHeight = 220;
	export let highlightLabelPosition = null;
	export let clusterLabelAnchorX = 24;
	export let highlightShareLabel = '';
	export let scenarioHeader = { left: '', right: '' };
	export let laidOutDraws = [];
	export let donutSize = 18;
	export let donutInner = 5;
	export let minimumShares = {};

	export let onIconEnter = null;
	export let onIconMove = null;
	export let onIconLeave = null;
	export let onIconFocus = null;
	export let onIconBlur = null;
</script>

<div
	class="stage-wrap"
	class:cluster-stage={layoutMode === 'cluster'}
	class:waffle-stage={layoutMode !== 'cluster'}
	style={`width:${availableFieldSize}px; height:${layoutMode === 'cluster' ? fieldSize : vizHeight}px;`}
>
	{#if layoutMode === 'cluster' && highlightLabelPosition}
		<div
			class="highlight-count"
			style={`left: ${clusterLabelAnchorX}px; top: ${highlightLabelPosition.top}px;`}
			aria-hidden="true"
		>
			{highlightShareLabel}
		</div>
	{/if}

	{#if layoutMode !== 'cluster' && scenarioMode !== 'none'}
		<div class="stack-title left">{scenarioHeader.left}</div>
		<div class="stack-title right">{scenarioHeader.right}</div>
	{/if}

	<div
		class="stage-canvas"
		style={`width:${availableFieldSize}px; height:${layoutMode === 'cluster' ? fieldSize : vizHeight}px;`}
	>
		{#each laidOutDraws as draw (draw.drawNumber)}
			<div
				class="icon"
				class:cluster-icon={layoutMode === 'cluster'}
				class:dimmed={layoutMode === 'cluster' && scenarioMode !== 'none' && !draw.isHighlighted}
				style={`transform: translate(${draw.left}px, ${draw.top}px);`}
				role="button"
				tabindex="0"
				animate:flip={{ duration: 450, easing: (t) => t * (2 - t) }}
				on:mouseenter={(event) =>
					onIconEnter?.(draw.parts, draw.drawNumber, draw.groupSize ?? null, event)}
				on:mousemove={(event) => onIconMove?.(event)}
				on:mouseleave={() => onIconLeave?.()}
				on:focus={(event) =>
					onIconFocus?.(draw.parts, draw.drawNumber, draw.groupSize ?? null, event.currentTarget)}
				on:blur={() => onIconBlur?.()}
			>
				<DrawDonut
					parts={draw.parts}
					size={donutSize}
					inner={donutInner}
					referenceMinimums={minimumShares}
				/>
			</div>
		{/each}
	</div>
</div>

<style>
	.stage-wrap {
		position: relative;
		margin: 0 auto;
		transition: height 650ms cubic-bezier(0.2, 0.75, 0.2, 1);
	}
	.waffle-stage {
		overflow: hidden;
	}
	.cluster-stage {
		overflow: visible;
	}
	.stack-title {
		position: absolute;
		top: 0;
		width: calc((100% - 16px) / 2);
		font-size: 0.9rem;
		font-weight: 600;
		line-height: 1.2;
		pointer-events: none;
	}
	.stack-title.left {
		left: 0;
	}
	.stack-title.right {
		left: calc(((100% - 16px) / 2) + 16px);
	}
	.stage-canvas {
		position: relative;
		margin: 0 auto;
		transition:
			width 450ms ease,
			height 450ms ease;
	}
	.highlight-count {
		position: absolute;
		z-index: 0;
		color: rgba(17, 17, 17, 0.3);
		font-size: clamp(2.5rem, 6vw, 5.5rem);
		font-weight: 700;
		line-height: 1;
		transform: translate(-100%, -50%);
		pointer-events: none;
		user-select: none;
	}
	.icon {
		position: absolute;
		left: 0;
		top: 0;
		transition: transform 650ms cubic-bezier(0.2, 0.75, 0.2, 1);
	}
	.cluster-icon {
		z-index: 1;
		transition: opacity 220ms ease;
	}
	.icon.dimmed {
		opacity: 0.2;
	}
</style>
