// src/core/utils.ts

import { IMatch } from "../entities/Match";

interface HeadToHeadStats {
    wins1: number; // Siege von Spieler 1 gegen Spieler 2
    wins2: number; // Siege von Spieler 2 gegen Spieler 1
    total: number; // Gesamtanzahl der Spiele zwischen den beiden
}

export const calculateHeadToHeadStats = (matches: IMatch[]): Map<string, HeadToHeadStats> => {
    const headToHeadMap = new Map<string, HeadToHeadStats>();

    for (const match of matches) {
        const key = `${match.player1Id}-${match.player2Id}`;
        const reverseKey = `${match.player2Id}-${match.player1Id}`;

        let stats: HeadToHeadStats;

        if (headToHeadMap.has(key)) {
            stats = headToHeadMap.get(key)!;
        } else if (headToHeadMap.has(reverseKey)) {
            stats = headToHeadMap.get(reverseKey)!;
        } else {
            stats = { wins1: 0, wins2: 0, total: 0 };
            headToHeadMap.set(key, stats);
        }

        stats.total += 1;
        if (match.winnerId === match.player1Id) {
            stats.wins1 += 1;
        } else {
            stats.wins2 += 1;
        }

        headToHeadMap.set(key, stats);
    }

    return headToHeadMap;
};
