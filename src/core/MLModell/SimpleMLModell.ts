// src/core/ml/SimpleMLModel.ts


import { MLModelWeight } from "../entities/MLModellWeight";
import SPService from "../services/SPService/implementations/SPService";

export interface MatchData {
    player1Id: number;
    player2Id: number;
    winnerId: number;
    score1: number; // Anzahl der gewonnenen Sätze von Spieler 1
    score2: number; // Anzahl der gewonnenen Sätze von Spieler 2
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
        this.weights = new Array(13).fill(0); // 1 + 1 + 10 + 1 = 13
    }

    /**
     * Lädt die gespeicherten Gewichte aus der SharePoint-Liste.
     */
    // src/core/ml/SimpleMLModel.ts

    public async loadWeights(): Promise<void> {
        const storedWeights = await this.spService.getModelWeights(this.modelName);
        console.log("Modellname:", this.modelName);
        if (storedWeights) {
            this.weights = [
                storedWeights.Bias,
                storedWeights.WeightEloDifference,
                storedWeights.WeightPlayer1VsPlayer2,
                storedWeights.WeightPlayer1VsPlayer3,
                storedWeights.WeightPlayer1VsPlayer4,
                storedWeights.WeightPlayer1VsPlayer5,
                storedWeights.WeightPlayer2VsPlayer3,
                storedWeights.WeightPlayer2VsPlayer4,
                storedWeights.WeightPlayer2VsPlayer5,
                storedWeights.WeightPlayer3VsPlayer4,
                storedWeights.WeightPlayer3VsPlayer5,
                storedWeights.WeightPlayer4VsPlayer5,
                storedWeights.WeightSetsDifference,
            ];
            console.log("Modellgewichte geladen:", this.weights);
        } else {
            console.log("Keine gespeicherten Gewichte gefunden. Modell initialisiert mit [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0].");
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
            WeightSetsDifference: this.weights[3],
            WeightPlayer1VsPlayer2: this.weights[4],
            WeightPlayer1VsPlayer3: this.weights[5],
            WeightPlayer1VsPlayer4: this.weights[6],
            WeightPlayer1VsPlayer5: this.weights[7],
            WeightPlayer2VsPlayer3: this.weights[8],
            WeightPlayer2VsPlayer4: this.weights[9],
            WeightPlayer2VsPlayer5: this.weights[10],
            WeightPlayer3VsPlayer4: this.weights[11],
            WeightPlayer3VsPlayer5: this.weights[12],
            WeightPlayer4VsPlayer5: this.weights[13],
            LastUpdated: new Date().toISOString(),
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
                // Berechnung von z: Bias + Gewichte * Features
                let z = this.weights[0]; // Bias
                for (let i = 1; i < this.weights.length; i++) {
                    z += this.weights[i] * features[i - 1];
                }
                const prediction = this.sigmoid(z);
                const y = match.winnerId === match.player1Id ? 1 : 0;
                const error = y - prediction;

                // Aktualisiere die Gewichte
                this.weights[0] += this.learningRate * error * 1; // Bias
                for (let i = 1; i < this.weights.length; i++) {
                    this.weights[i] += this.learningRate * error * features[i - 1];
                }

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

    public predict(match: MatchData): number {
        const features = this.extractFeatures(match);
        let z = this.weights[0]; // Bias
        for (let i = 1; i < this.weights.length; i++) {
            z += this.weights[i] * features[i - 1];
        }
        return this.sigmoid(z);
    }


    private extractFeatures(match: MatchData): number[] {
        const x1 = match.elo1 - match.elo2; // ELO-Differenz
        const x2 = match.headToHeadWinRate1; // Head-to-Head-Winrate
        const x3 = match.score1 - match.score2; // Sätze-Differenz

        // One-Hot-Encoding für die Spielerpaare
        const interactionFeatures = [
            match.player1Id === 1 && match.player2Id === 2 ? 1 : 0, // Player1VsPlayer2
            match.player1Id === 1 && match.player2Id === 3 ? 1 : 0, // Player1VsPlayer3
            match.player1Id === 1 && match.player2Id === 4 ? 1 : 0, // Player1VsPlayer4
            match.player1Id === 1 && match.player2Id === 5 ? 1 : 0, // Player1VsPlayer5
            match.player1Id === 2 && match.player2Id === 3 ? 1 : 0, // Player2VsPlayer3
            match.player1Id === 2 && match.player2Id === 4 ? 1 : 0, // Player2VsPlayer4
            match.player1Id === 2 && match.player2Id === 5 ? 1 : 0, // Player2VsPlayer5
            match.player1Id === 3 && match.player2Id === 4 ? 1 : 0, // Player3VsPlayer4
            match.player1Id === 3 && match.player2Id === 5 ? 1 : 0, // Player3VsPlayer5
            match.player1Id === 4 && match.player2Id === 5 ? 1 : 0, // Player4VsPlayer5
        ];

        return [x1, x2, x3, ...interactionFeatures];
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
        let z = this.weights[0]; // Bias
        for (let i = 1; i < this.weights.length; i++) {
            z += this.weights[i] * features[i - 1];
        }
        const prediction = this.sigmoid(z);
        const y = match.winnerId === match.player1Id ? 1 : 0;
        const error = y - prediction;

        // Aktualisiere die Gewichte
        this.weights[0] += this.learningRate * error * 1; // Bias
        for (let i = 1; i < this.weights.length; i++) {
            this.weights[i] += this.learningRate * error * features[i - 1];
        }

        console.log("Modellgewichte nach Update:", this.weights);
    }
}
