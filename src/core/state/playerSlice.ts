import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import SPServiceProvider from '../services/SPService/SPServiceProvider';
import { IPlayer } from '../entities/Player';
import { PlayerEloHistoryEntry } from '../entities/PlayerEloHistoryEntry';

export interface PlayerState {
    players: IPlayer[];
    eloHistory: { [playerId: number]: PlayerEloHistoryEntry[] };
    isLoadingEloHistory: boolean;
}

const initialState: PlayerState = {
    players: [],
    eloHistory: {},
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
    },
});

export default playerSlice.reducer;
