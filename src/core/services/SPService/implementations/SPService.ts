import { SPFI, spfi, SPFx } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { IPlayer } from "../../../entities/Player";
import { IMatch } from "../../../entities/Match";
import { ISPService } from "../ISPService";


export default class SPService implements ISPService {
    private sp: SPFI;
    private startingRanking = 1000;
    private KFactor = 32;

    constructor(context: WebPartContext) {
        this.sp = spfi().using(SPFx(context));
    }

    public async getPlayerEloHistory(playerId: number): Promise<{ matchNumber: number; elo: number }[]> {
        const matches = await this.getAllMatches();

        // Initialisiere die ELO-Werte aller Spieler
        const players = await this.getAllPlayers();
        const playerEloMap = new Map<number, number>();
        players.forEach(player => {
            playerEloMap.set(player.id, this.startingRanking);
        });

        // Sortiere die Matches nach Datum
        matches.sort((a, b) => a.date.getTime() - b.date.getTime());

        let eloHistory: { matchNumber: number; elo: number }[] = [];
        let matchCounter = 0;

        const initialElo = this.startingRanking;
        eloHistory.push({ matchNumber: 0, elo: initialElo });

        for (let match of matches) {
            const player1Id = match.player1Id;
            const player2Id = match.player2Id;

            const player1Elo = playerEloMap.get(player1Id) || this.startingRanking;
            const player2Elo = playerEloMap.get(player2Id) || this.startingRanking;

            const player1Score = match.score1;
            const player2Score = match.score2;

            // Erstellen von temporären Spielerobjekten
            const player1 = { id: player1Id, rankingPoints: player1Elo } as IPlayer;
            const player2 = { id: player2Id, rankingPoints: player2Elo } as IPlayer;

            // Berechnen der neuen ELO-Werte
            const { newRating1, newRating2 } = this.calculateNewRatings(
                player1,
                player2,
                player1Score,
                player2Score
            );

            // Aktualisieren der ELO-Werte
            playerEloMap.set(player1Id, newRating1);
            playerEloMap.set(player2Id, newRating2);

            // Wenn das Match den interessierten Spieler betrifft, ELO-Wert speichern
            if (player1Id === playerId || player2Id === playerId) {
                matchCounter++;
                const currentElo = playerEloMap.get(playerId) || this.startingRanking;
                eloHistory.push({ matchNumber: matchCounter, elo: currentElo });
            }
        }

        return eloHistory;
    }



    public async getMatches(): Promise<IMatch[]> {
        try {
            const items = await this.sp.web.lists.getByTitle("Matches").items.select("Id", "Title", "Player1Id", "Player2Id", "Score1", "Score2", "WinnerId", "Datum").top(10000)();
            return items.map((item: any) => ({
                id: item.Id,
                player1Id: item.Player1Id,
                player2Id: item.Player2Id,
                score1: item.Score1,
                score2: item.Score2,
                winnerId: item.WinnerId,
                date: new Date(item.Datum)
            }));
        } catch (error) {
            console.error("Error fetching matches:", error);
            return [];
        }
    }

    public async getPlayers(): Promise<IPlayer[]> {
        const players = await this.sp.web.lists.getByTitle("Players").items();
        const matches = await this.getMatches();
        const filteredMatches = this.filterMatchesForCurrentMonth(matches);

        return players.map((item: { Id: number; Title: string; RankingPoints: number; }) => {
            const playerMatches = filteredMatches.filter(match => match.player1Id == item.Id || match.player2Id == item.Id);
            const wins = playerMatches.filter(match => match.winnerId == item.Id).length;
            const losses = playerMatches.length - wins;
            const setDifference = playerMatches.reduce((acc, match) => {
                if (match.player1Id == item.Id) {
                    acc += match.score1 - match.score2;
                } else {
                    acc += match.score2 - match.score1;
                }
                return acc;
            }, 0);
            let gesamt = wins + losses;
            return {
                id: item.Id,
                name: item.Title,
                rankingPoints: item.RankingPoints,
                gesamt,
                wins,
                losses,
                setDifference
            };
        });
    }


    private async getPlayerById(playerId: number): Promise<IPlayer> {
        // const test = await this.sp.web.lists.getByTitle("Players").items.getById(playerId);
        // console.log("Fetching player by ID:", test);
        const playerItem = await this.sp.web.lists.getByTitle("Players").items.getById(playerId).select("Id", "Title", "RankingPoints", "Wins", "Losses", "SetDifference")();
        // console.log("Player item:", playerItem);
        return {
            id: playerItem.Id,
            name: playerItem.Title,
            rankingPoints: playerItem.RankingPoints,
            gesamt: playerItem.Wins + playerItem.Losses,
            wins: playerItem.Wins,
            losses: playerItem.Losses,
            setDifference: playerItem.SetDifference
        };
    }

    private calculateNewRatings(player1: IPlayer, player2: IPlayer, score1: number, score2: number) {
        const R_A = player1.rankingPoints;
        const R_B = player2.rankingPoints;
        console.log("Ratings:", R_A, R_B);
        // Sicherstellen, dass RankingPoints definiert und gültig sind
        console.log("Ratings:", R_A, R_B);
        // Berechnung des erwarteten Scores
        const E_A = 1 / (1 + Math.pow(10, (R_B - R_A) / 400));
        const E_B = 1 / (1 + Math.pow(10, (R_A - R_B) / 400));

        let S_A, S_B;
        if (score1 > score2) {
            S_A = score2 === 0 ? 1 : 0.75; // 1 bei klarem Sieg, 0.75 bei knappen Sieg
            S_B = score2 === 0 ? 0 : 0.25; // 0 bei klarer Niederlage, 0.25 bei knapper Niederlage
        } else {
            S_A = score1 === 0 ? 0 : 0.25; // 0 bei klarer Niederlage, 0.25 bei knapper Niederlage
            S_B = score1 === 0 ? 1 : 0.75; // 1 bei klarem Sieg, 0.75 bei knappen Sieg
        }

        // Bewertung der tatsächlichen Leistung im Vergleich zur erwarteten Leistung
        const delta_A = S_A - E_A;
        const delta_B = S_B - E_B;

        // Anpassung der Punkte
        let newRating1 = R_A + this.KFactor * delta_A;
        let newRating2 = R_B + this.KFactor * delta_B;

        // Runden auf zwei Dezimalstellen
        newRating1 = parseFloat(newRating1.toFixed(2));
        newRating2 = parseFloat(newRating2.toFixed(2));

        // Zusätzliche Regelung: Punktegewinne bei knappen Niederlagen
        if (newRating1 > R_A && score1 < score2) {
            newRating1 = R_A; // Spieler 1 hat knapp verloren, keine Punktverluste
        }
        if (newRating2 > R_B && score2 < score1) {
            newRating2 = R_B; // Spieler 2 hat knapp verloren, keine Punktverluste
        }
        return { newRating1, newRating2 };
    }


    private async updatePlayerStatistics(player: IPlayer): Promise<void> {
        console.log("Updating player statistics:", player.id, player.rankingPoints, player.wins, player.losses, player.setDifference);
        await this.sp.web.lists.getByTitle("Players").items.getById(player.id).update({
            RankingPoints: player.rankingPoints,
            Wins: player.wins,
            Losses: player.losses,
            SetDifference: player.setDifference,
            Gesamt: player.wins + player.losses
        });
    }


    // SPService.ts
    public async getAllPlayers(): Promise<IPlayer[]> {
        try {
            const items = await this.sp.web.lists.getByTitle("Players").items.select("Id", "Title", "RankingPoints", "Wins", "Losses", "SetDifference")();
            return items.map((item: any) => ({
                id: item.Id,
                name: item.Title,
                rankingPoints: item.RankingPoints,
                gesamt: item.Wins + item.Losses,
                wins: item.Wins,
                losses: item.Losses,
                setDifference: item.SetDifference
            }));
        } catch (error) {
            console.error("Error fetching players:", error);
            return [];
        }
    }

    public async getAllMatches(): Promise<IMatch[]> {
        try {
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const currentMonth = currentDate.getMonth(); // 0-basiert (Januar = 0)

            // Startdatum: Erster Tag des aktuellen Monats
            const startDate = new Date(Date.UTC(currentYear, currentMonth, 1));
            // Enddatum: Erster Tag des nächsten Monats
            const endDate = new Date(Date.UTC(currentYear, currentMonth + 1, 1));

            // Konvertiere die Daten in ISO-Strings ohne Millisekunden
            const startDateString = startDate.toISOString().split('.')[0] + 'Z';
            const endDateString = endDate.toISOString().split('.')[0] + 'Z';

            const items = await this.sp.web.lists.getByTitle("Matches").items
                .select("Id", "Player1Id", "Player2Id", "Score1", "Score2", "WinnerId", "Datum")
                .filter(`Datum ge datetime'${startDateString}' and Datum lt datetime'${endDateString}'`)
                .top(10000)();

            return items.map((item: any) => ({
                id: item.Id,
                player1Id: item.Player1Id,
                player2Id: item.Player2Id,
                score1: item.Score1,
                score2: item.Score2,
                winnerId: item.WinnerId,
                date: new Date(item.Datum)
            }));
        } catch (error) {
            console.error("Error fetching matches:", error);
            return [];
        }
    }

    public async recalculateRankings(): Promise<void> {
        const players = await this.getAllPlayers();
        const matches = await this.getAllMatches();
        const filteredMatches = this.filterMatchesForCurrentMonth(matches);

        // Sort Matches by Date
        filteredMatches.sort((a, b) => a.date.getTime() - b.date.getTime());

        // Reset Player Stats for the Month
        const playerMap = new Map<number, IPlayer>();
        players.forEach(player => {
            player.rankingPoints = this.startingRanking;
            player.wins = 0;
            player.losses = 0;
            player.setDifference = 0;
            playerMap.set(player.id, player);
        });

        filteredMatches.forEach(match => {
            const player1 = playerMap.get(match.player1Id);
            const player2 = playerMap.get(match.player2Id);

            if (player1 && player2) {
                const { newRating1, newRating2 } = this.calculateNewRatings(player1, player2, match.score1, match.score2);

                // Update ranking points
                player1.rankingPoints = newRating1;
                player2.rankingPoints = newRating2;

                // Update wins/losses and set difference
                if (match.score1 > match.score2) {
                    player1.wins += 1;
                    player2.losses += 1;
                } else {
                    player2.wins += 1;
                    player1.losses += 1;
                }

                player1.setDifference += match.score1 - match.score2;
                player2.setDifference += match.score2 - match.score1;

                playerMap.set(player1.id, player1);
                playerMap.set(player2.id, player2);
            }
        });

        // Save updated player statistics
        for (const player of playerMap.values()) {
            await this.updatePlayerStatistics(player);
        }
    }


    private filterMatchesForCurrentMonth(matches: IMatch[]): IMatch[] {
        const currentDate = new Date();
        const currentYear = currentDate.getUTCFullYear();
        const currentMonth = currentDate.getUTCMonth(); // This is zero-based, so September is 8

        return matches.filter(match => {
            const matchDate = new Date(match.date);
            const matchMonth = matchDate.getUTCMonth(); // Also zero-based
            const matchYear = matchDate.getUTCFullYear();

            // Ensure the match is from the current month and year (in UTC)
            console.log(`Match Date: ${matchDate}, Match Month (UTC): ${matchMonth}, Match Year (UTC): ${matchYear}, Today: ${currentDate}`);
            return matchYear === currentYear && matchMonth === currentMonth;
        });
    }

    public async addMatch(match: IMatch): Promise<void> {
        const player1 = await this.getPlayerById(match.player1Id);
        const player2 = await this.getPlayerById(match.player2Id);
        const { newRating1, newRating2 } = this.calculateNewRatings(player1, player2, match.score1, match.score2);

        // Update ranking points
        player1.rankingPoints = newRating1;
        player2.rankingPoints = newRating2;

        // Update wins/losses and set difference
        if (match.score1 > match.score2) {
            player1.wins += 1;
            player2.losses += 1;
        } else {
            player2.wins += 1;
            player1.losses += 1;
        }

        player1.setDifference += match.score1 - match.score2;
        player2.setDifference += match.score2 - match.score1;

        // Save the updated player statistics
        await this.updatePlayerStatistics(player1);
        await this.updatePlayerStatistics(player2);

        // Speichere das Match in der SharePoint-Liste und stelle sicher, dass das Datum in UTC gespeichert wird
        const player1Name = player1.name;
        const player2Name = player2.name;

        const matchDate = new Date(); // Das aktuelle Datum
        const matchDateUTC = matchDate.toISOString(); // In ISO/UTC Format

        await this.sp.web.lists.getByTitle("Matches").items.add({
            Title: `${player1Name} vs. ${player2Name}`,
            Player1Id: match.player1Id,
            Player2Id: match.player2Id,
            Score1: match.score1,
            Score2: match.score2,
            WinnerId: match.winnerId,
            Datum: matchDateUTC // Speichern im UTC-Format
        });
    }

}