// src/components/AddMatchDialog/AddMatchDialog.tsx
import * as React from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { TextField } from '@fluentui/react/lib/TextField';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { MessageBar, MessageBarType } from '@fluentui/react';
import { useAppDispatch, useAppSelector } from '../../../core/state/hook';
import { addMatch } from '../../../core/state/matchSlice';
import { IMatch } from '../../../core/entities/Match';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import SPService from '../../../core/services/SPService/implementations/SPService';
import { calculateHeadToHeadStats } from '../../../core/MLModell/headToHeadHelper';
import { SimpleMLModel, MatchData } from '../../../core/MLModell/SimpleMLModell';
import styles from './SbsTableTennis.module.scss';
import * as strings from 'SbsTableTennisWebPartStrings';

export interface IAddMatchDialogProps {
    isOpen: boolean;
    onDismiss: () => void;
    context: WebPartContext; // WebPartContext wird übergeben
}

const AddMatchDialog = (props: IAddMatchDialogProps) => {
    const dispatch = useAppDispatch();
    const players = useAppSelector((state) => state.player.players);
    const allMatches = useAppSelector((state) => state.match.matches);
    const { isOpen, onDismiss, context } = props;

    const [player1Id, setPlayer1Id] = React.useState<number | undefined>();
    const [player2Id, setPlayer2Id] = React.useState<number | undefined>();
    const [score1, setscore1] = React.useState<number>(0); // Gewonnene Sätze von Spieler 1
    const [score2, setscore2] = React.useState<number>(0); // Gewonnene Sätze von Spieler 2

    const [winProbability1, setWinProbability1] = React.useState<number | null>(null);
    const [winProbability2, setWinProbability2] = React.useState<number | null>(null);

    const [aiWinProbability1, setAiWinProbability1] = React.useState<number | null>(null);
    const [aiWinProbability2, setAiWinProbability2] = React.useState<number | null>(null);

    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
    const [headToHeadMap, setHeadToHeadMap] = React.useState<Map<string, { wins1: number; wins2: number; total: number }>>(
        new Map()
    );

    const playerOptions: IDropdownOption[] = players.map((player) => ({
        key: player.id,
        text: player.name,
    }));

    // Hilfsfunktion, um NaN-Werte abzufangen
    const safe = (value: number, fallback: number) => (isNaN(value) ? fallback : value);

    // Erhalte SPService als Singleton
    const spService = useMemo(() => new SPService(context), [context]);
    const modelName = "MatchPredictionModel";
    const fmt = (s: string, ...args: any[]) => s.replace(/\{(\d+)\}/g, (_m, i) => String(args[i]));

    const mlModelRef = useRef<SimpleMLModel | null>(null);

    // Funktion zur Berechnung der Gewinnwahrscheinlichkeiten (inkl. neuer Features)
    const calculateWinProbabilities = async (player1Id: number, player2Id: number) => {
        const player1 = players.find((p) => p.id === player1Id);
        const player2 = players.find((p) => p.id === player2Id);

        if (player1 && player2) {
            const R_A = player1.rankingPoints;
            const R_B = player2.rankingPoints;
            const E_A = 1 / (1 + Math.pow(10, (R_B - R_A) / 400));
            const E_B = 1 - E_A;
            setWinProbability1(E_A);
            setWinProbability2(E_B);

            // Head-to-Head
            const key = `${player1Id}-${player2Id}`;
            const reverseKey = `${player2Id}-${player1Id}`;
            const stats = headToHeadMap.get(key) || headToHeadMap.get(reverseKey);
            const headToHeadWinRate1 = safe(stats && stats.total > 0 ? stats.wins1 / stats.total : 0.5, 0.5);

            // Neue Features abfragen
            const recentWinRate = safe(await spService.calculateRecentWinRate(player1Id, 5), 0.5);
            const winningStreak = safe(await spService.calculateWinningStreak(player1Id), 0);
            const avgMargin = safe(await spService.calculateAvgMargin(player1Id), 0);

            // KI-basierte Prognose
            if (mlModelRef.current) {
                const matchData: MatchData = {
                    player1Id,
                    player2Id,
                    winnerId: 0, // unbekannter Ausgang
                    score1,
                    score2,
                    elo1: R_A,
                    elo2: R_B,
                    headToHeadWinRate1,
                    recentWinRate,
                    winningStreak,
                    avgMargin,
                };
                const aiProbability = mlModelRef.current.predict(matchData);
                setAiWinProbability1(safe(aiProbability, 0));
                setAiWinProbability2(safe(1 - aiProbability, 0));
            }
        }
    };

    // Beim Öffnen des Dialogs: Zustände zurücksetzen, Head-to-Head berechnen und Modell trainieren
    useEffect(() => {
        if (isOpen) {
            setPlayer1Id(undefined);
            setPlayer2Id(undefined);
            setscore1(0);
            setscore2(0);
            setWinProbability1(null);
            setWinProbability2(null);
            setAiWinProbability1(null);
            setAiWinProbability2(null);
            setErrorMessage(null);

            const statsMap = calculateHeadToHeadStats(allMatches);
            setHeadToHeadMap(statsMap);

            const prepareMatchData = async () => {
                const matchesData: MatchData[] = [];

                for (const match of allMatches) {
                    const player1 = players.find((p) => p.id === match.player1Id);
                    const player2 = players.find((p) => p.id === match.player2Id);

                    if (player1 && player2) {
                        const headToHeadWinRate1 = safe(await spService.calculateHeadToHeadWinRate(match.player1Id, match.player2Id), 0.5);
                        const recentWinRate = safe(await spService.calculateRecentWinRate(match.player1Id, 5), 0.5);
                        const winningStreak = safe(await spService.calculateWinningStreak(match.player1Id), 0);
                        const avgMargin = safe(await spService.calculateAvgMargin(match.player1Id), 0);

                        matchesData.push({
                            player1Id: match.player1Id,
                            player2Id: match.player2Id,
                            winnerId: match.winnerId,
                            score1: match.score1,
                            score2: match.score2,
                            elo1: player1.rankingPoints,
                            elo2: player2.rankingPoints,
                            headToHeadWinRate1,
                            recentWinRate,
                            winningStreak,
                            avgMargin,
                        });
                    }
                }

                try {
                    const model = new SimpleMLModel(modelName, spService);
                    await model.loadWeights();
                    model.train(matchesData);
                    mlModelRef.current = model;
                } catch (error) {
                    console.error("Fehler beim Initialisieren des Modells:", error);
                    setErrorMessage(strings.ErrorSavingMatch);
                }
            };

            prepareMatchData();
        }
    }, [isOpen, allMatches, players, spService, modelName]);

    // Handler für Spieler 1 Auswahl
    const handlePlayer1Change = (e: React.FormEvent<HTMLDivElement>, option?: IDropdownOption) => {
        const selectedPlayer1Id = option?.key as number;
        setPlayer1Id(selectedPlayer1Id);

        if (selectedPlayer1Id && player2Id && selectedPlayer1Id !== player2Id) {
            calculateWinProbabilities(selectedPlayer1Id, player2Id);
            setErrorMessage(null);
        } else {
            setWinProbability1(null);
            setWinProbability2(null);
            setAiWinProbability1(null);
            setAiWinProbability2(null);
            if (selectedPlayer1Id === player2Id) {
                setErrorMessage(strings.PlayersMustDiffer);
            }
        }
    };

    const handlePlayer2Change = (e: React.FormEvent<HTMLDivElement>, option?: IDropdownOption) => {
        const selectedPlayer2Id = option?.key as number;
        setPlayer2Id(selectedPlayer2Id);

        if (player1Id && selectedPlayer2Id && player1Id !== selectedPlayer2Id) {
            calculateWinProbabilities(player1Id, selectedPlayer2Id);
            setErrorMessage(null);
        } else {
            setWinProbability1(null);
            setWinProbability2(null);
            setAiWinProbability1(null);
            setAiWinProbability2(null);
            if (player1Id === selectedPlayer2Id) {
                setErrorMessage(strings.PlayersMustDiffer);
            }
        }
    };

    const handleSave = async () => {
        if (
            player1Id &&
            player2Id &&
            player1Id !== player2Id &&
            score1 >= 0 &&
            score2 >= 0 &&
            (score1 === 2 || score2 === 2) &&
            (score1 + score2 <= 3)
        ) {
            const winnerId = score1 > score2 ? player1Id : player2Id;
            const match: IMatch = {
                id: 0,
                player1Id,
                player2Id,
                score1,
                score2,
                winnerId,
                date: new Date(),
            };

            try {
                await dispatch(addMatch(match)).unwrap();

                if (mlModelRef.current) {
                    const player1 = players.find((p) => p.id === player1Id);
                    const player2 = players.find((p) => p.id === player2Id);
                    const headToHeadWinRate1 = safe(await spService.calculateHeadToHeadWinRate(player1Id, player2Id), 0.5);
                    const recentWinRate = safe(await spService.calculateRecentWinRate(player1Id, 5), 0.5);
                    const winningStreak = safe(await spService.calculateWinningStreak(player1Id), 0);
                    const avgMargin = safe(await spService.calculateAvgMargin(player1Id), 0);

                    const matchData: MatchData = {
                        player1Id,
                        player2Id,
                        winnerId,
                        score1,
                        score2,
                        elo1: player1 ? player1.rankingPoints : 1000,
                        elo2: player2 ? player2.rankingPoints : 1000,
                        headToHeadWinRate1,
                        recentWinRate,
                        winningStreak,
                        avgMargin,
                    };

                    mlModelRef.current.updateModel(matchData);
                    await mlModelRef.current.saveWeights();
                }

                onDismiss();
            } catch (error) {
                console.error("Fehler beim Speichern des Matches:", error);
                setErrorMessage(strings.ErrorSavingMatch);
            }
        } else {
            setErrorMessage(strings.InvalidMatchData);
        }
    };

    return (
        <Dialog
            hidden={!isOpen}
            onDismiss={onDismiss}
            dialogContentProps={{
                type: DialogType.largeHeader,
                title: strings.AddMatchDialogTitle,
                closeButtonAriaLabel: strings.Close,
            }}
            modalProps={{
                isBlocking: false,
                styles: { main: { maxWidth: 450 } },
            }}
        >
            <div className={styles.dialogContent}>
                <div className={styles.formRow}>
                    <Dropdown
                        placeholder={strings.SelectPlayer1Placeholder}
                        label={strings.Player1Label}
                        options={playerOptions}
                        onChange={handlePlayer1Change}
                        className={styles.formField}
                        selectedKey={player1Id}
                    />
                    <Dropdown
                        placeholder={strings.SelectPlayer2Placeholder}
                        label={strings.Player2Label}
                        options={playerOptions}
                        onChange={handlePlayer2Change}
                        className={styles.formField}
                        selectedKey={player2Id}
                    />
                </div>

                <div className={styles.formRow}>
                    <TextField
                        label={strings.SetsWonPlayer1Label}
                        type="number"
                        min={0}
                        max={2}
                        value={score1.toString()}
                        onChange={(e, newValue) => {
                            const val = Number(newValue);
                            if (val >= 0 && val <= 2) {
                                setscore1(val);
                            }
                        }}
                        className={styles.formField}
                    />
                    <TextField
                        label={strings.SetsWonPlayer2Label}
                        type="number"
                        min={0}
                        max={2}
                        value={score2.toString()}
                        onChange={(e, newValue) => {
                            const val = Number(newValue);
                            if (val >= 0 && val <= 2) {
                                setscore2(val);
                            }
                        }}
                        className={styles.formField}
                    />
                </div>

                {winProbability1 !== null && winProbability2 !== null && (
                    <div className={styles.winProbabilities}>
                        <MessageBar messageBarType={MessageBarType.info}>
                            <p className={styles.winProbability}>
                                {fmt(strings.EloWinChanceFor, players.find((p) => p.id === player1Id)?.name ?? '', (winProbability1 * 100).toFixed(2))}
                            </p>
                            <p className={styles.winProbability}>
                                {fmt(strings.EloWinChanceFor, players.find((p) => p.id === player2Id)?.name ?? '', (winProbability2 * 100).toFixed(2))}
                            </p>
                        </MessageBar>
                    </div>
                )}

                {aiWinProbability1 !== null && aiWinProbability2 !== null && (
                    <div className={styles.winProbabilities}>
                        <MessageBar messageBarType={MessageBarType.success}>
                            <p className={styles.winProbability}>
                                {fmt(strings.AiWinChanceFor, players.find((p) => p.id === player1Id)?.name ?? '', (aiWinProbability1 * 100).toFixed(2))}
                            </p>
                            <p className={styles.winProbability}>
                                {fmt(strings.AiWinChanceFor, players.find((p) => p.id === player2Id)?.name ?? '', (aiWinProbability2 * 100).toFixed(2))}
                            </p>
                        </MessageBar>
                    </div>
                )}

                {errorMessage && (
                    <MessageBar messageBarType={MessageBarType.error}>{errorMessage}</MessageBar>
                )}
            </div>
            <DialogFooter>
                <PrimaryButton onClick={handleSave} text={strings.Save} />
                <DefaultButton onClick={onDismiss} text={strings.Cancel} />
            </DialogFooter>
        </Dialog>
    );
};

export default AddMatchDialog;

