const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export function getPhyllotaxisPosition(index, spacing = 1) {
	const angle = index * GOLDEN_ANGLE;
	const radius = spacing * Math.sqrt(index + 0.5);
	return {
		x: radius * Math.cos(angle),
		y: radius * Math.sin(angle)
	};
}

export function buildPhyllotaxisLayout({
	count,
	availableFieldSize,
	minDonutSize,
	maxDonutSize,
	fieldPadding = 4,
	minGap = 1
}) {
	const unitPositions = Array.from({ length: count }, (_, index) => getPhyllotaxisPosition(index, 1));

	let minUnitDistance = Number.POSITIVE_INFINITY;
	for (let i = 0; i < unitPositions.length; i++) {
		for (let j = i + 1; j < unitPositions.length; j++) {
			const dx = unitPositions[i].x - unitPositions[j].x;
			const dy = unitPositions[i].y - unitPositions[j].y;
			const distance = Math.hypot(dx, dy);
			if (distance < minUnitDistance) minUnitDistance = distance;
		}
	}

	const maxUnitRadius = unitPositions.reduce(
		(max, pos) => Math.max(max, Math.hypot(pos.x, pos.y)),
		0
	);

	const k =
		minUnitDistance > 0 && Number.isFinite(minUnitDistance)
			? (2 * maxUnitRadius) / minUnitDistance
			: 1;
	const fittedSize = Math.floor((availableFieldSize - (k + fieldPadding)) / (k + 1));
	const donutSize = Math.max(minDonutSize, Math.min(maxDonutSize, fittedSize));

	const targetMinCenterDistance = donutSize + minGap;
	const spacing =
		minUnitDistance > 0 && Number.isFinite(minUnitDistance)
			? targetMinCenterDistance / minUnitDistance
			: donutSize;

	const positions = unitPositions.map((pos) => ({
		x: pos.x * spacing,
		y: pos.y * spacing
	}));

	const maxRadius =
		positions.reduce((max, pos) => Math.max(max, Math.hypot(pos.x, pos.y)), 0) +
		donutSize / 2 +
		fieldPadding;
	const fieldSize = Math.min(availableFieldSize, Math.max(donutSize + 10, Math.ceil(maxRadius * 2)));

	const items = positions.map((pos, index) => ({
		index,
		left: pos.x + fieldSize / 2 - donutSize / 2,
		top: pos.y + fieldSize / 2 - donutSize / 2
	}));

	return { donutSize, fieldSize, items };
}
