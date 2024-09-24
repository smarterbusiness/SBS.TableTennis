import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import SPServiceProvider from '../services/SPService/SPServiceProvider';
import { IPlayer } from '../entities/Player';

export interface PlayerState {
    players: IPlayer[];
}

const initialState: PlayerState = {
    players: []
};

export const fetchPlayers = createAsyncThunk(
    'players/fetchPlayers',
    async () => {
        const service = SPServiceProvider.GetService();
        return service.getPlayers();
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
    }
});

// export const { } = playerSlice.actions;

export default playerSlice.reducer;
