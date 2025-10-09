// src/core/ml/SimpleMLModel.ts

import { MLModelWeight } from "../entities/MLModellWeight";
import SPService from "../services/SPService/implementations/SPService";

export interface MatchData {
    player1Id: number;
    player2Id: number;
    winnerId: number;
    score1: number; // Gewonnene Sätze von Spieler 1
    score2: number; // Gewonnene Sätze von Spieler 2
    elo1: number;
    elo2: number;
    headToHeadWinRate1: number; // Gewinnrate von Spieler 1 gegen Spieler 2
    // Neue Features:
    recentWinRate: number;  // Gewinnquote in den letzten n Matches von Spieler 1 (z. B. n=5)
    winningStreak: number;  // Anzahl der aktuell aufeinanderfolgenden Siege von Spieler 1
    avgMargin: number;      // Durchschnittlicher Satzunterschied in den gewonnenen Matches von Spieler 1
}

export class SimpleMLModel {
    // Insgesamt 7 Parameter: Bias und 6 Gewichte
    private weights: number[] = [];
    private learningRate = 0.005;
    private epochs = 2000;
    private modelName: string;
    private spService: SPService;

    constructor(modelName: string, spService: SPService) {
        this.modelName = modelName;
        this.spService = spService;
        // Initialisiere mit 7 Nullen: [Bias, EloDiff, HeadToHead, SetsDiff, RecentWinRate, WinningStreak, AvgMargin]
        this.weights = new Array(7).fill(0);
    }

    /**
     * Lädt die gespeicherten Gewichte aus der SharePoint-Liste.
     */
    public async loadWeights(): Promise<void> {
        const storedWeights = await this.spService.getModelWeights(this.modelName);
        if (storedWeights) {
            // Verwende Number() und fallback auf 0, falls der Wert null/undefined oder ungültig ist
            this.weights = [
                Number(storedWeights.Bias) || 0,
                Number(storedWeights.WeightEloDifference) || 0,
                Number(storedWeights.WeightHeadToHead) || 0,
                Number(storedWeights.WeightSetsDifference) || 0,
                Number(storedWeights.WeightRecentWinRate) || 0,
                Number(storedWeights.WeightWinningStreak) || 0,
                Number(storedWeights.WeightAvgMargin) || 0,
            ];
            console.log("Modellgewichte geladen:", this.weights);
        } else {
            console.log("Keine gespeicherten Gewichte gefunden. Initialisiere mit:", this.weights);
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
            WeightRecentWinRate: this.weights[4],
            WeightWinningStreak: this.weights[5],
            WeightAvgMargin: this.weights[6],
            LastUpdated: new Date().toISOString(),
        };
        await this.spService.saveModelWeights(this.modelName, weightsToSave);
        console.log("Modellgewichte gespeichert:", this.weights);
    }

    /**
     * Trainiert das Modell mit historischen Daten.
     */
    public train(matches: MatchData[]) {
        for (let epoch = 0; epoch < this.epochs; epoch++) {
            let totalError = 0;
            for (const match of matches) {
                const features = this.extractFeatures(match);
                let z = this.weights[0]; // Bias
                for (let i = 1; i < this.weights.length; i++) {
                    z += this.weights[i] * features[i - 1];
                }
                const prediction = this.sigmoid(z);
                const y = match.winnerId === match.player1Id ? 1 : 0;
                const error = y - prediction;

                // Gewichte updaten
                this.weights[0] += this.learningRate * error;
                for (let i = 1; i < this.weights.length; i++) {
                    this.weights[i] += this.learningRate * error * features[i - 1];
                }
                totalError += Math.abs(error);
            }
            console.log(`Epoch ${epoch + 1}: Total Error = ${totalError.toFixed(4)}`);
            if (totalError < 0.01) {
                console.log(`Training abgebrochen nach ${epoch + 1} Epochen`);
                break;
            }
        }
        console.log("Abgeschlossene Gewichte:", this.weights);
    }


    /**
     * Gibt die Vorhersage zurück (Wahrscheinlichkeit, dass Spieler1 gewinnt).
     */
    public predict(match: MatchData): number {
        const features = this.extractFeatures(match);
        let z = this.weights[0]; // Bias
        for (let i = 1; i < this.weights.length; i++) {
            z += this.weights[i] * features[i - 1];
        }
        return this.sigmoid(z);
    }

    /**
     * Extrahiert Features aus den Match-Daten:
     * x₁: ELO-Differenz (elo1 - elo2)
     * x₂: Head-to-Head-Winrate (Spieler1 gegen Spieler2)
     * x₃: Satzdifferenz (score1 - score2)
     * x₄: Recent Win Rate (aus den letzten n Matches)
     * x₅: Winning Streak (aktuelle Siegesserie)
     * x₆: Durchschnittlicher Satzunterschied bei Siegen
     */
    private extractFeatures(match: MatchData): number[] {
        const x1 = match.elo1 - match.elo2;
        const x2 = match.headToHeadWinRate1;
        const x3 = match.score1 - match.score2;
        const x4 = match.recentWinRate;
        const x5 = match.winningStreak;
        const x6 = match.avgMargin;
        return [x1, x2, x3, x4, x5, x6];
    }

    private sigmoid(z: number): number {
        return 1 / (1 + Math.exp(-z));
    }

    /**
     * Aktualisiert das Modell nach einem neuen Match.
     */
    public updateModel(match: MatchData) {
        const features = this.extractFeatures(match);
        let z = this.weights[0];
        for (let i = 1; i < this.weights.length; i++) {
            z += this.weights[i] * features[i - 1];
        }
        const prediction = this.sigmoid(z);
        const y = match.winnerId === match.player1Id ? 1 : 0;
        const error = y - prediction;

        this.weights[0] += this.learningRate * error;
        for (let i = 1; i < this.weights.length; i++) {
            this.weights[i] += this.learningRate * error * features[i - 1];
        }
        console.log("Modellgewichte nach Update:", this.weights);
    }
}
