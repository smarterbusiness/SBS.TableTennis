export interface IPlayer {
  id: number;
  name: string;
  rankingPoints: number;
  gesamt: number;      // Gesamtanzahl der Spiele
  wins: number;       // Anzahl der Siege
  losses: number;     // Anzahl der Niederlagen
  setDifference: number; // Satzdifferenz
}
