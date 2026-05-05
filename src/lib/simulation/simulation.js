export function createSimulationInputs(prediction) {
	const parties = Object.keys(prediction.vote_shares || {});
	const baseShares = parties.map((party) => prediction.vote_shares[party] || 0);
	const totalShare = baseShares.reduce((sum, value) => sum + value, 0) || 100;
	const probabilities = baseShares.map((value) => value / totalShare);
	const simulationSampleSize = prediction.statistical?.sample_size ?? 1500;
	return { parties, probabilities, simulationSampleSize };
}

export function simulateOnce(sampleSize, probabilities) {
	const counts = new Array(probabilities.length).fill(0);
	for (let i = 0; i < sampleSize; i++) {
		const r = Math.random();
		let cumulative = 0;
		for (let j = 0; j < probabilities.length; j++) {
			cumulative += probabilities[j];
			if (r < cumulative) {
				counts[j]++;
				break;
			}
		}
	}
	return counts;
}

export function buildDraw(sampleSize, probabilities, parties) {
	const counts = simulateOnce(sampleSize, probabilities);
	const total = counts.reduce((sum, value) => sum + value, 0) || 1;
	return parties.map((party, index) => ({
		party,
		count: counts[index],
		value: counts[index] / total
	}));
}

export function recalculateOthers(shares) {
	const nonOthersTotal = Object.entries(shares)
		.filter(([party]) => party !== 'Others')
		.reduce((sum, [, value]) => sum + (Number(value) || 0), 0);
	return { ...shares, Others: Math.max(0, 100 - nonOthersTotal) };
}

export function buildMinimumShares(parties, drawPool) {
	const minimums = Object.fromEntries(parties.map((party) => [party, 1]));
	for (const draw of drawPool) {
		for (const part of draw) {
			minimums[part.party] = Math.min(minimums[part.party] ?? 1, part.value);
		}
	}
	return minimums;
}
