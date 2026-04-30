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
