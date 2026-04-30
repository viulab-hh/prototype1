export const scenarioConfigs = {
	linke5: {
		parties: ['Die Linke'],
		threshold: 0.05,
		comparison: 'gte',
		labelMatch: 'Die Linke ≥ 5%',
		labelOther: 'Die Linke < 5%',
		buttonLabel: 'Die Linke über 5%'
	},
	fdp5: {
		parties: ['FDP'],
		threshold: 0.08,
		comparison: 'gte',
		labelMatch: 'FDP ≥ 8%',
		labelOther: 'FDP < 8%',
		buttonLabel: 'FDP über 8%'
	},
	spdgruenelinke40: {
		parties: ['SPD', 'Greens', 'Die Linke'],
		threshold: 0.4,
		comparison: 'gte',
		labelMatch: 'SPD + Grüne + Die Linke ≥ 40%',
		labelOther: 'SPD + Grüne + Die Linke < 40%',
		buttonLabel: 'SPD + Grüne + Die Linke über 40%'
	},
	cdu25: {
		parties: ['CDU/CSU'],
		threshold: 0.25,
		comparison: 'gte',
		labelMatch: 'CDU/CSU ≥ 25%',
		labelOther: 'CDU/CSU < 25%',
		buttonLabel: 'CDU/CSU über 25%'
	},
	'bsw-below-5': {
		parties: ['BSW'],
		threshold: 0.05,
		comparison: 'lt',
		labelMatch: 'BSW < 5%',
		labelOther: 'BSW ≥ 5%',
		buttonLabel: 'BSW unter 5%'
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
