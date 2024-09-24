import { IMatch } from "../../entities/Match";
import { IPlayer } from "../../entities/Player";

//make isp
export interface ISPService {
    getPlayers(): Promise<IPlayer[]>;
    getMatches(): Promise<IMatch[]>;
    addMatch(match: IMatch): Promise<void>;
    recalculateRankings(): Promise<void>;
}
