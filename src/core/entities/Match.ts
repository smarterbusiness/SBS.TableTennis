export interface IMatch {
    id: number;         // Eindeutige ID des Matches
    player1Id: number;  // ID des ersten Spielers
    player2Id: number;  // ID des zweiten Spielers
    score1: number;     // Punkte, die Spieler 1 erreicht hat
    score2: number;     // Punkte, die Spieler 2 erreicht hat
    winnerId: number;   // ID des Gewinners
    date: Date;         // Datum des Matches
}