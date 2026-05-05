import { buildPhyllotaxisLayout } from '$lib/phyllotaxisLayout.js';

export function getWafflePosition(index, columns, donutSize, waffleGap, splitHeaderHeight) {
	const column = index % columns;
	const row = Math.floor(index / columns);
	return {
		x: column * (donutSize + waffleGap),
		y: splitHeaderHeight + row * (donutSize + waffleGap)
	};
}

export function buildPhyllotaxisView({ count, fieldLimit, minDonutSize, maxDonutSize }) {
	const layout = buildPhyllotaxisLayout({
		count,
		availableFieldSize: fieldLimit,
		minDonutSize,
		maxDonutSize,
		fieldPadding: 4,
		minGap: 1
	});

	const resolvedDonutSize = layout.donutSize;
	const resolvedFieldSize = layout.fieldSize;
	return {
		layout,
		donutSize: resolvedDonutSize,
		donutInner: Math.max(4, Math.round(resolvedDonutSize * 0.29)),
		fieldSize: resolvedFieldSize,
		phyllotaxisOffsetX: Math.max(0, (fieldLimit - resolvedFieldSize) / 2)
	};
}

export function sortClusterDraws(draws, scenarioMode, getMaxShare, matchesScenario) {
	const decorated = draws.map((draw) => ({
		...draw,
		isHighlighted: matchesScenario(draw.parts, scenarioMode)
	}));

	return [...decorated].sort((a, b) => {
		if (a.isHighlighted !== b.isHighlighted) return a.isHighlighted ? -1 : 1;
		return getMaxShare(b.parts) - getMaxShare(a.parts) || a.id - b.id;
	});
}

export function calculateHighlightInfo(laidOutDraws, donutSize, clusterDraws) {
	const highlightedDraws = laidOutDraws.filter((draw) => draw.isHighlighted);
	const highlightCount = highlightedDraws.reduce((sum, draw) => sum + draw.groupSize, 0);
	const highlightShareLabel =
		clusterDraws.length > 0 ? `${Math.round((highlightCount / clusterDraws.length) * 100)}%` : '';

	let highlightLabelPosition = null;
	if (highlightedDraws.length > 0) {
		const minTop = Math.min(...highlightedDraws.map((draw) => draw.top));
		const maxBottom = Math.max(...highlightedDraws.map((draw) => draw.top + donutSize));
		highlightLabelPosition = { top: minTop + (maxBottom - minTop) / 2 };
	}

	return { highlightShareLabel, highlightLabelPosition };
}
