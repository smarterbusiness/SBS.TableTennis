import { IMatch } from "../../entities/Match";
import { IPlayer } from "../../entities/Player";
import { PlayerEloHistoryEntry } from "../../entities/PlayerEloHistoryEntry";

//make isp
export interface ISPService {
    getPlayers(): Promise<IPlayer[]>;
    getMatches(): Promise<IMatch[]>;
    addMatch(match: IMatch): Promise<void>;
    recalculateRankings(): Promise<void>;
    getPlayerEloHistory(playerId: number): Promise<PlayerEloHistoryEntry[]>;
    calculateHeadToHeadWinRate(player1Id: number, player2Id: number): Promise<number>;
    getPlayersForMonth(year: number, month: number): Promise<IPlayer[]>;
    calculateAvgMargin(playerId: number): Promise<number>;
    calculateWinningStreak(playerId: number): Promise<number>;
    calculateRecentWinRate(playerId: number, n: number): Promise<number>;
    getPlayerMatches(playerId: number): Promise<IMatch[]>;
    getPlayerEloHistoryAllTime(playerId: number): Promise<PlayerEloHistoryEntry[]>;
}
