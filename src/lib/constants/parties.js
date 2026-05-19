export const partyColors = {
	'CDU/CSU': '#111111',
	SPD: '#E3000F',
	Greens: '#64A12D',
	AfD: '#009EE0',
	FDP: '#FFED00',
	BSW: '#6E2C91',
	'Die Linke': '#BE3075',
	Others: '#9CA3AF'
};

export const partyLabels = {
	'CDU/CSU': 'Christian Democrats',
	SPD: 'Social Democrats',
	Greens: 'Greens',
	AfD: 'AfD',
	FDP: 'Free Democrats',
	BSW: 'BSW',
	'Die Linke': 'The Left',
	Others: 'Others'
};

export function getPartyColor(party) {
	return partyColors[party] || '#9CA3AF';
}

export function getPartyLabel(party) {
	return partyLabels[party] || party;
}
