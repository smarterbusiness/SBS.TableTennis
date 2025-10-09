import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import SPServiceProvider from '../services/SPService/SPServiceProvider';
import { IPlayer } from '../entities/Player';
import { PlayerEloHistoryEntry } from '../entities/PlayerEloHistoryEntry';
import { IMatch } from '../entities/Match';

export interface ComputedStats {
    avgMargin: number;      // Durchschnittlicher Satzunterschied in gewonnenen Matches
    winningStreak: number;  // Aktuelle Siegesserie
    recentWinRate: number;  // Gewinnquote in den letzten n Matches (z. B. n=5)
}

export interface PlayerState {
    players: IPlayer[];
    prevPlayers: IPlayer[];
    allTimeMatches: IMatch[];
    allTimeEloHistory: { [playerId: number]: PlayerEloHistoryEntry[] };
    eloHistory: { [playerId: number]: PlayerEloHistoryEntry[] };
    computedStats: { [playerId: number]: ComputedStats };
    isLoadingEloHistory: boolean;
}

const initialState: PlayerState = {
    players: [],
    prevPlayers: [],
    allTimeMatches: [],
    eloHistory: {},
    allTimeEloHistory: {},
    computedStats: {},
    isLoadingEloHistory: false,
};

export const fetchPlayers = createAsyncThunk(
    'players/fetchPlayers',
    async () => {
        const service = SPServiceProvider.GetService();
        return service.getPlayers();
    }
);

export const fetchPlayerEloHistory = createAsyncThunk(
    'players/fetchPlayerEloHistory',
    async (playerId: number) => {
        const service = SPServiceProvider.GetService();
        const history = await service.getPlayerEloHistory(playerId);
        return { playerId, history };
    }
);

export const getPlayersForMonth = createAsyncThunk(
    'players/getPlayersForMonth',
    async (month: number) => {
        const service = SPServiceProvider.GetService();
        const now = new Date();
        let year = now.getUTCFullYear();
        if (month === 0) {
            month = 11;
            year--;
        } else {
            month--;
        }
        return service.getPlayersForMonth(year, month);
    }
);

export const calculateAvgMargin = createAsyncThunk(
    'players/calculateAvgMargin',
    async (playerId: number) => {
        const service = SPServiceProvider.GetService();
        return service.calculateAvgMargin(playerId);
    }
);

export const getPlayerMatches = createAsyncThunk(
    'players/getPlayerMatches',
    async (playerId: number) => {
        const service = SPServiceProvider.GetService();
        return service.getPlayerMatches(playerId);
    }
);

export const calculateWinningStreak = createAsyncThunk(
    'players/calculateWinningStreak',
    async (playerId: number) => {
        const service = SPServiceProvider.GetService();
        return service.calculateWinningStreak(playerId);
    }
);

export const calculateRecentWinRate = createAsyncThunk(
    'players/calculateRecentWinRate',
    async (playerId: number) => {
        const service = SPServiceProvider.GetService();
        return service.calculateRecentWinRate(playerId, 5);
    }
);

export const fetchAllTimeEloHistory = createAsyncThunk(
    'players/allTimeEloHistory',
    async (playerId: number) => {
        const service = SPServiceProvider.GetService();
        return service.getPlayerEloHistoryAllTime(playerId);
    }
);

export const playerSlice = createSlice({
    name: 'players',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(fetchPlayers.fulfilled, (state, action) => {
            state.players = action.payload;
        });
        builder.addCase(fetchPlayerEloHistory.pending, (state) => {
            state.isLoadingEloHistory = true;
        });
        builder.addCase(fetchPlayerEloHistory.fulfilled, (state, action) => {
            const { playerId, history } = action.payload;
            state.eloHistory[playerId] = history;
            state.isLoadingEloHistory = false;
        });
        builder.addCase(fetchPlayerEloHistory.rejected, (state) => {
            state.isLoadingEloHistory = false;
        });
        builder.addCase(getPlayersForMonth.fulfilled, (state, action) => {
            state.prevPlayers = action.payload;
        });
        // ComputedStats für AvgMargin aktualisieren
        builder.addCase(calculateAvgMargin.fulfilled, (state, action) => {
            const playerId = action.meta.arg as number;
            if (!state.computedStats[playerId]) {
                state.computedStats[playerId] = { avgMargin: 0, winningStreak: 0, recentWinRate: 0 };
            }
            state.computedStats[playerId].avgMargin = action.payload;
        });
        // ComputedStats für WinningStreak aktualisieren
        builder.addCase(calculateWinningStreak.fulfilled, (state, action) => {
            const playerId = action.meta.arg as number;
            if (!state.computedStats[playerId]) {
                state.computedStats[playerId] = { avgMargin: 0, winningStreak: 0, recentWinRate: 0 };
            }
            state.computedStats[playerId].winningStreak = action.payload;
        });
        // ComputedStats für RecentWinRate aktualisieren
        builder.addCase(calculateRecentWinRate.fulfilled, (state, action) => {
            const playerId = action.meta.arg as number;
            if (!state.computedStats[playerId]) {
                state.computedStats[playerId] = { avgMargin: 0, winningStreak: 0, recentWinRate: 0 };
            }
            state.computedStats[playerId].recentWinRate = action.payload;
        });
        builder.addCase(getPlayerMatches.fulfilled, (state, action) => {
            state.allTimeMatches = action.payload;
        });
        builder.addCase(fetchAllTimeEloHistory.fulfilled, (state, action) => {
            state.allTimeEloHistory[action.meta.arg] = action.payload
        });
    },
});

export default playerSlice.reducer;
