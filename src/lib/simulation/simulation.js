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

export function allocateSeats(parts, totalSeats, thresholdPct) {
	const seats = Object.fromEntries(parts.map((part) => [part.party, 0]));
	const threshold = (Number(thresholdPct) || 0) / 100;

	const eligible = parts.filter(
		(part) => part.party !== 'Others' && (part.value ?? 0) >= threshold
	);
	if (!eligible.length) return seats;

	const eligibleTotal = eligible.reduce((sum, part) => sum + (part.value ?? 0), 0);
	if (eligibleTotal <= 0) return seats;

	const allocations = eligible.map((part) => {
		const exact = ((part.value ?? 0) / eligibleTotal) * totalSeats;
		const floorSeats = Math.floor(exact);
		return {
			party: part.party,
			floorSeats,
			remainder: exact - floorSeats
		};
	});

	let assigned = allocations.reduce((sum, item) => sum + item.floorSeats, 0);
	let remaining = Math.max(0, totalSeats - assigned);
	allocations.sort((a, b) => b.remainder - a.remainder);

	for (let i = 0; i < allocations.length; i++) {
		const bonus = remaining > 0 ? 1 : 0;
		seats[allocations[i].party] = allocations[i].floorSeats + bonus;
		if (remaining > 0) remaining--;
	}

	assigned = Object.values(seats).reduce((sum, value) => sum + value, 0);
	if (assigned < totalSeats && allocations.length > 0) {
		seats[allocations[0].party] += totalSeats - assigned;
	}

	return seats;
}
