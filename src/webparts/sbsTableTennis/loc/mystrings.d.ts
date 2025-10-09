declare interface ISbsTableTennisWebPartStrings {
  PropertyPaneDescription: string;
  BasicGroupName: string;
  DescriptionFieldLabel: string;
  AppLocalEnvironmentSharePoint: string;
  AppLocalEnvironmentTeams: string;
  AppLocalEnvironmentOffice: string;
  AppLocalEnvironmentOutlook: string;
  AppSharePointEnvironment: string;
  AppTeamsTabEnvironment: string;
  AppOfficeEnvironment: string;
  AppOutlookEnvironment: string;
  // App UI
  LeaderboardTitle: string;
  ColumnName: string;
  ColumnRankingPoints: string;
  ColumnTotal: string;
  ColumnWins: string;
  ColumnLosses: string;
  ColumnSetDifference: string;
  AddMatchButton: string;
  RecalculateRankingsButton: string;
  AriaToggleSelection: string;
  AriaToggleSelectionAll: string;
  MedalFirstPlaceAria: string;
  MedalSecondPlaceAria: string;
  MedalThirdPlaceAria: string;

  // AddMatchDialog
  AddMatchDialogTitle: string;
  Close: string;
  SelectPlayer1Placeholder: string;
  SelectPlayer2Placeholder: string;
  Player1Label: string;
  Player2Label: string;
  SetsWonPlayer1Label: string;
  SetsWonPlayer2Label: string;
  EloWinChanceFor: string; // {0}=name, {1}=percent
  AiWinChanceFor: string; // {0}=name, {1}=percent
  PlayersMustDiffer: string;
  ErrorSavingMatch: string;
  InvalidMatchData: string;
  Save: string;
  Cancel: string;

  // PlayerStatsDialog
  PlayerStatsTitle: string; // {0}=player name
  CurrentElo: string;
  TotalGames: string;
  Wins: string;
  Losses: string;
  SetDifference: string;
  LoadingEloHistory: string;
  EloProgressThisMonth: string;
  EloRatingLegend: string;
  EloProgress: string;
  BasicStats: string;
  AdditionalStats: string;
  AllTimeStatsLabel: string;
  CurrentStatsLabel: string;
  AllTimeStatsTab: string;
  CurrentStatsTab: string;
  WinningStreak: string;
  RecentWinRate: string;
  AvgMargin: string;
  CurrentWinningStreak: string;
  CalculatingStats: string;
}

declare module 'SbsTableTennisWebPartStrings' {
  const strings: ISbsTableTennisWebPartStrings;
  export = strings;
}
