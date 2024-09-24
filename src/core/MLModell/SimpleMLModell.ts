// src/core/ml/SimpleMLModel.ts

import { MLModelWeight } from "../entities/MLModellWeight";
import SPService from "../services/SPService/implementations/SPService";

export interface MatchData {
    player1Id: number;
    player2Id: number;
    winnerId: number;
    elo1: number;
    elo2: number;
    headToHeadWinRate1: number; // Gewinnrate von Spieler 1 gegen Spieler 2
}

export class SimpleMLModel {
    private weights: number[] = [];
    private learningRate = 0.001;
    private epochs = 1000;
    private modelName: string;
    private spService: SPService;

    constructor(modelName: string, spService: SPService) {
        this.modelName = modelName;
        this.spService = spService;
        // Initialisiere die Gewichte [Bias, Gewicht für ELO-Differenz, Gewicht für Head-to-Head]
        this.weights = [0, 0, 0];
    }

    /**
     * Lädt die gespeicherten Gewichte aus der SharePoint-Liste.
     */
    public async loadWeights(): Promise<void> {
        const storedWeights = await this.spService.getModelWeights(this.modelName);
        if (storedWeights) {
            this.weights = [
                storedWeights.Bias,
                storedWeights.WeightEloDifference,
                storedWeights.WeightHeadToHead,
            ];
            console.log("Modellgewichte geladen:", this.weights);
        } else {
            console.log("Keine gespeicherten Gewichte gefunden. Modell initialisiert mit [0, 0, 0].");
        }
    }

    /**
     * Speichert die aktuellen Gewichte in der SharePoint-Liste.
     */
    public async saveWeights(): Promise<void> {
        const weightsToSave: MLModelWeight = {
            Title: this.modelName,
            Bias: this.weights[0],
            WeightEloDifference: this.weights[1],
            WeightHeadToHead: this.weights[2],
            LastUpdated: new Date().toISOString(),
            // Id wird nicht gesetzt; SPService handhabt Update oder Add
        };
        await this.spService.saveModelWeights(this.modelName, weightsToSave);
        console.log("Modellgewichte gespeichert:", this.weights);
    }

    /**
     * Trainiert das Modell mit historischen Daten.
     * @param matches Array von MatchData.
     */
    public train(matches: MatchData[]) {
        for (let epoch = 0; epoch < this.epochs; epoch++) {
            let totalError = 0;

            for (const match of matches) {
                const features = this.extractFeatures(match);
                const z = this.weights[0] + this.weights[1] * features[1] + this.weights[2] * features[2];
                const prediction = this.sigmoid(z);
                const y = match.winnerId === match.player1Id ? 1 : 0;
                const error = y - prediction;

                // Aktualisiere die Gewichte
                this.weights[0] += this.learningRate * error; // Bias
                this.weights[1] += this.learningRate * error * features[1]; // ELO-Differenz
                this.weights[2] += this.learningRate * error * features[2]; // Head-to-Head-Winrate

                totalError += Math.abs(error);
            }

            // Abbruchbedingung, wenn der Gesamtfehler klein genug ist
            if (totalError < 0.01) {
                console.log(`Training abgebrochen nach ${epoch + 1} Epochen mit Gesamtfehler: ${totalError}`);
                break;
            }
        }

        console.log("Modelltraining abgeschlossen:", this.weights);
    }

    /**
     * Gibt die Gewinnwahrscheinlichkeit für Spieler 1 zurück.
     * @param match MatchData.
     * @returns Gewinnwahrscheinlichkeit für Spieler 1.
     */
    public predict(match: MatchData): number {
        const features = this.extractFeatures(match);
        const z = this.weights[0] + this.weights[1] * features[1] + this.weights[2] * features[2];
        return this.sigmoid(z);
    }

    private extractFeatures(match: MatchData): number[] {
        const x0 = 1; // Bias-Term
        const x1 = match.elo1 - match.elo2; // ELO-Differenz
        const x2 = match.headToHeadWinRate1; // Head-to-Head-Winrate
        return [x0, x1, x2];
    }

    private sigmoid(z: number): number {
        return 1 / (1 + Math.exp(-z));
    }

    /**
     * Aktualisiert das Modell nach einem neuen Match.
     * @param match MatchData.
     */
    public updateModel(match: MatchData) {
        const features = this.extractFeatures(match);
        const z = this.weights[0] + this.weights[1] * features[1] + this.weights[2] * features[2];
        const prediction = this.sigmoid(z);
        const y = match.winnerId === match.player1Id ? 1 : 0;
        const error = y - prediction;

        // Aktualisiere die Gewichte
        this.weights[0] += this.learningRate * error; // Bias
        this.weights[1] += this.learningRate * error * features[1]; // ELO-Differenz
        this.weights[2] += this.learningRate * error * features[2]; // Head-to-Head-Winrate

        console.log("Modellgewichte nach Update:", this.weights);
    }
}
