// src/core/ml/SimpleMLModel.ts

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

    constructor() {
        // Initialisiere die Gewichte [Bias, Gewicht für ELO-Differenz, Gewicht für Head-to-Head]
        this.weights = [0, 0, 0];
    }

    // Trainiert das Modell mit historischen Daten
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
                break;
            }
        }
    }

    // Gibt die Gewinnwahrscheinlichkeit für Spieler 1 zurück
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

    // Aktualisiert das Modell nach einem neuen Match
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
    }
}
