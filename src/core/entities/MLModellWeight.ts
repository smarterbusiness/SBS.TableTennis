export interface MLModelWeight {
    Id?: number; // Optional, wird von SharePoint automatisch gesetzt
    Title: string; // ModelName
    Bias: number;
    WeightEloDifference: number;
    WeightHeadToHead: number;
    WeightSetsDifference: number;

    // Interaktionsgewichte für alle Spielerpaare
    WeightPlayer1VsPlayer2: number;
    WeightPlayer1VsPlayer3: number;
    WeightPlayer1VsPlayer4: number;
    WeightPlayer1VsPlayer5: number;
    WeightPlayer2VsPlayer3: number;
    WeightPlayer2VsPlayer4: number;
    WeightPlayer2VsPlayer5: number;
    WeightPlayer3VsPlayer4: number;
    WeightPlayer3VsPlayer5: number;
    WeightPlayer4VsPlayer5: number;

    LastUpdated: string; // ISO Date String
}
