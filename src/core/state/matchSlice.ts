import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import SPServiceProvider from '../services/SPService/SPServiceProvider';
import { IMatch } from '../entities/Match';
import { fetchPlayers } from './playerSlice';

export interface MatchState {
    matches: IMatch[];
}

const initialState: MatchState = {
    matches: []
};

export const addMatch = createAsyncThunk(
    'matches/addMatch',
    async (newMatch: IMatch, { dispatch }) => {
        const service = SPServiceProvider.GetService();
        await service.addMatch(newMatch);
        dispatch(fetchPlayers());
        return newMatch;
    }
);

export const recalculateRankings = createAsyncThunk(
    'matches/recalculateRankings',
    async (_, { dispatch }) => {
        const service = SPServiceProvider.GetService();
        await service.recalculateRankings();
        dispatch(fetchPlayers()); // Spieler neu laden nach Neuberechnung der Rankings
    }
);

export const matchSlice = createSlice({
    name: 'matches',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(addMatch.fulfilled, (state, action) => {
            state.matches.push(action.payload);
        });
    }
});

export default matchSlice.reducer;
