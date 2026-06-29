export const scenarioConfigs = {
	cdu_fdp: {
		parties: ['CDU/CSU', 'FDP'],
		threshold: 0.33,
		comparison: 'gte',
		labelMatch: 'CDU/CSU + FDP ≥ 33%',
		labelOther: 'CDU/CSU + FDP < 33%',
		buttonLabel: 'CDU/CSU + FDP ≥ 33%'
	},
	spd_greens: {
		parties: ['SPD', 'Greens'],
		threshold: 0.37,
		comparison: 'gte',
		labelMatch: 'SPD + Greens ≥ 37%',
		labelOther: 'SPD + Greens < 37%',
		buttonLabel: 'SPD + Greens ≥ 37%'
	},
	cdu_spd: {
		parties: ['CDU/CSU', 'SPD'],
		threshold: 0.46,
		comparison: 'gte',
		labelMatch: 'CDU/CSU + SPD ≥ 46%',
		labelOther: 'CDU/CSU + SPD < 46%',
		buttonLabel: 'CDU/CSU + SPD ≥ 46%'
	},
	fdp_over8: {
		parties: ['FDP'],
		threshold: 0.08,
		comparison: 'gte',
		labelMatch: 'FDP ≥ 8%',
		labelOther: 'FDP < 8%',
		buttonLabel: 'FDP ≥ 8%'
	},
	bsw_over5: {
		parties: ['BSW'],
		threshold: 0.05,
		comparison: 'gte',
		labelMatch: 'BSW ≥ 5%',
		labelOther: 'BSW < 5%',
		buttonLabel: 'BSW ≥ 5%'
	},
	linke_over5: {
		parties: ['Die Linke'],
		threshold: 0.05,
		comparison: 'gte',
		labelMatch: 'The Left ≥ 5%',
		labelOther: 'The Left < 5%',
		buttonLabel: 'The Left ≥ 5%'
	}
};

export function getPartyShare(parts, ...names) {
	return names.reduce((sum, name) => sum + (parts.find((p) => p.party === name)?.value ?? 0), 0);
}

export function matchesScenario(parts, mode, configs = scenarioConfigs) {
	if (mode === 'none') return false;
	const cfg = configs[mode];
	if (!cfg) return false;
	const share = getPartyShare(parts, ...cfg.parties);
	return cfg.comparison === 'lt' ? share < cfg.threshold : share >= cfg.threshold;
}

export function getMaximumPartyShare(parts) {
	return Math.max(...parts.map((part) => part.value), 0);
}

export function partitionScenarioDraws(entries, mode, configs = scenarioConfigs) {
	const cfg = configs[mode];
	if (!cfg) {
		return {
			matching: [],
			other: [],
			header: { left: '', right: '' }
		};
	}

	const matching = [];
	const other = [];
	for (const draw of entries) {
		if (matchesScenario(draw.parts, mode, configs)) {
			matching.push(draw);
		} else {
			other.push(draw);
		}
	}

	return {
		matching,
		other,
		header: {
			left: `${cfg.labelMatch} (${matching.length})`,
			right: `${cfg.labelOther} (${other.length})`
		}
	};
}

export function computeMatchCounts(entries, configs) {
	const counts = {};
	for (const key of Object.keys(configs)) {
		counts[key] = entries.filter((e) => matchesScenario(e.parts, key, configs)).length;
	}
	return counts;
}
