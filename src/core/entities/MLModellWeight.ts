// src/core/entities/MLModellWeight.ts

export interface MLModelWeight {
    Id?: number; // Optional, wird von SharePoint automatisch gesetzt
    Title: string; // ModelName
    Bias: number;
    WeightEloDifference: number;
    WeightHeadToHead: number;
    LastUpdated: string; // ISO Date String
}
