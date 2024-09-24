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
import { MatchData, SimpleMLModel } from '../../../core/MLModell/SimpleMLModell';
import { calculateHeadToHeadStats } from '../../../core/MLModell/headToHeadHelper';
import styles from './SbsTableTennis.module.scss';

export interface IAddMatchDialogProps {
    isOpen: boolean;
    onDismiss: () => void;
    context: WebPartContext; // Stelle sicher, dass der WebPartContext übergeben wird
}

const AddMatchDialog = (props: IAddMatchDialogProps) => {
    const dispatch = useAppDispatch();
    const players = useAppSelector((state) => state.player.players);
    const allMatches = useAppSelector((state) => state.match.matches);
    const { isOpen, onDismiss, context } = props;

    const [player1Id, setPlayer1Id] = React.useState<number | undefined>();
    const [player2Id, setPlayer2Id] = React.useState<number | undefined>();
    const [score1, setScore1] = React.useState<number>(0);
    const [score2, setScore2] = React.useState<number>(0);

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

    // Memoize spService und modelName, um stabile Referenzen zu gewährleisten
    const spService = useMemo(() => new SPService(context), [context]);
    const modelName = useMemo(() => "MatchPredictionModel", []); // konstante Zeichenkette

    // Verwende useRef, um die SimpleMLModel-Instanz zu speichern
    const mlModelRef = useRef<SimpleMLModel | null>(null);

    // useEffect nur ausführen, wenn isOpen sich ändert
    useEffect(() => {
        if (isOpen) {
            // Zustandsvariablen zurücksetzen
            setPlayer1Id(undefined);
            setPlayer2Id(undefined);
            setScore1(0);
            setScore2(0);
            setWinProbability1(null);
            setWinProbability2(null);
            setAiWinProbability1(null);
            setAiWinProbability2(null);
            setErrorMessage(null);

            // Head-to-Head-Statistiken berechnen
            const statsMap = calculateHeadToHeadStats(allMatches);
            setHeadToHeadMap(statsMap);

            // Historische Daten vorbereiten
            const matchesData: MatchData[] = allMatches.map((match) => {
                const player1 = players.find((p) => p.id === match.player1Id);
                const player2 = players.find((p) => p.id === match.player2Id);
                const key = `${match.player1Id}-${match.player2Id}`;
                const reverseKey = `${match.player2Id}-${match.player1Id}`;
                const stats = statsMap.get(key) || statsMap.get(reverseKey);

                // Berechne Head-to-Head-Winrate von Spieler 1 gegen Spieler 2
                const headToHeadWinRate1 = stats && stats.total > 0 ? stats.wins1 / stats.total : 0.5;

                return {
                    player1Id: match.player1Id,
                    player2Id: match.player2Id,
                    winnerId: match.winnerId,
                    elo1: player1 ? player1.rankingPoints : 1000,
                    elo2: player2 ? player2.rankingPoints : 1000,
                    headToHeadWinRate1,
                };
            });

            // Modell initialisieren, Gewichte laden und trainieren
            const initializeModel = async () => {
                try {
                    const model = new SimpleMLModel(modelName, spService);
                    await model.loadWeights();
                    model.train(matchesData);
                    mlModelRef.current = model;
                } catch (error) {
                    console.error("Fehler beim Initialisieren des Modells:", error);
                    setErrorMessage('Fehler beim Initialisieren des KI-Modells.');
                }
            };

            initializeModel();
        }
    }, [isOpen, allMatches, players, spService, modelName]);

    // Funktion zur Berechnung der Gewinnwahrscheinlichkeiten
    const calculateWinProbabilities = (player1Id: number, player2Id: number) => {
        const player1 = players.find((p) => p.id === player1Id);
        const player2 = players.find((p) => p.id === player2Id);

        if (player1 && player2) {
            // ELO-basierte Gewinnwahrscheinlichkeit
            const R_A = player1.rankingPoints;
            const R_B = player2.rankingPoints;

            const E_A = 1 / (1 + Math.pow(10, (R_B - R_A) / 400));
            const E_B = 1 - E_A;

            setWinProbability1(E_A);
            setWinProbability2(E_B);

            // Head-to-Head-Winrate berechnen
            const key = `${player1Id}-${player2Id}`;
            const reverseKey = `${player2Id}-${player1Id}`;
            const stats = headToHeadMap.get(key) || headToHeadMap.get(reverseKey);
            const headToHeadWinRate1 = stats && stats.total > 0 ? stats.wins1 / stats.total : 0.5;

            // KI-basierte Gewinnwahrscheinlichkeit berechnen
            if (mlModelRef.current) {
                const matchData: MatchData = {
                    player1Id,
                    player2Id,
                    winnerId: 0, // Unbekannt beim Vorhersagen
                    elo1: R_A,
                    elo2: R_B,
                    headToHeadWinRate1,
                };
                const aiProbability = mlModelRef.current.predict(matchData);
                setAiWinProbability1(aiProbability);
                setAiWinProbability2(1 - aiProbability);
            }
        }
    };

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
                setErrorMessage('Spieler 1 und Spieler 2 dürfen nicht identisch sein.');
            }
        }
    };

    // Handler für Spieler 2 Auswahl
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
                setErrorMessage('Spieler 1 und Spieler 2 dürfen nicht identisch sein.');
            }
        }
    };

    // Handler für Speichern des Matches
    const handleSave = async () => {
        if (player1Id && player2Id && player1Id !== player2Id && score1 >= 0 && score2 >= 0) {
            const winnerId = score1 > score2 ? player1Id : player2Id;
            const match: IMatch = {
                id: 0, // Die ID wird von SharePoint generiert
                player1Id,
                player2Id,
                score1,
                score2,
                winnerId,
                date: new Date(),
            };

            try {
                // Speichere das Match über den Redux-Dispatcher
                await dispatch(addMatch(match)).unwrap();

                // Modell aktualisieren
                if (mlModelRef.current) {
                    const player1 = players.find((p) => p.id === player1Id);
                    const player2 = players.find((p) => p.id === player2Id);
                    const key = `${player1Id}-${player2Id}`;
                    const reverseKey = `${player2Id}-${player1Id}`;
                    const stats = headToHeadMap.get(key) || headToHeadMap.get(reverseKey);

                    const headToHeadWinRate1 = stats && stats.total > 0 ? stats.wins1 / stats.total : 0.5;

                    const matchData: MatchData = {
                        player1Id,
                        player2Id,
                        winnerId,
                        elo1: player1 ? player1.rankingPoints : 1000,
                        elo2: player2 ? player2.rankingPoints : 1000,
                        headToHeadWinRate1,
                    };

                    mlModelRef.current.updateModel(matchData);
                    await mlModelRef.current.saveWeights(); // Speichern der aktualisierten Gewichte
                }

                onDismiss();
            } catch (error) {
                console.error("Fehler beim Speichern des Matches:", error);
                setErrorMessage('Fehler beim Speichern des Matches.');
            }
        } else {
            setErrorMessage('Bitte geben Sie gültige Daten ein.');
        }
    };

    return (
        <Dialog
            hidden={!isOpen}
            onDismiss={onDismiss}
            dialogContentProps={{
                type: DialogType.largeHeader,
                title: 'Neues Match hinzufügen',
                closeButtonAriaLabel: 'Close',
            }}
            modalProps={{
                isBlocking: false,
                styles: { main: { maxWidth: 450 } },
            }}
        >
            <div className={styles.dialogContent}>
                <div className={styles.formRow}>
                    <Dropdown
                        placeholder="Wählen Sie Spieler 1"
                        label="Spieler 1"
                        options={playerOptions}
                        onChange={handlePlayer1Change}
                        className={styles.formField}
                        selectedKey={player1Id}
                    />
                    <Dropdown
                        placeholder="Wählen Sie Spieler 2"
                        label="Spieler 2"
                        options={playerOptions}
                        onChange={handlePlayer2Change}
                        className={styles.formField}
                        selectedKey={player2Id}
                    />
                </div>

                {/* ELO-basierte Gewinnwahrscheinlichkeit */}
                {winProbability1 !== null && winProbability2 !== null && (
                    <div className={styles.winProbabilities}>
                        <MessageBar messageBarType={MessageBarType.info}>
                            <p className={styles.winProbability}>
                                <strong>{players.find((p) => p.id === player1Id)?.name}</strong>: {(winProbability1 * 100).toFixed(2)}% Gewinnchance (ELO)
                            </p>
                            <p className={styles.winProbability}>
                                <strong>{players.find((p) => p.id === player2Id)?.name}</strong>: {(winProbability2 * 100).toFixed(2)}% Gewinnchance (ELO)
                            </p>
                        </MessageBar>
                    </div>
                )}

                {/* KI-basierte Gewinnwahrscheinlichkeit */}
                {aiWinProbability1 !== null && aiWinProbability2 !== null && (
                    <div className={styles.winProbabilities}>
                        <MessageBar messageBarType={MessageBarType.success}>
                            <p className={styles.winProbability}>
                                <strong>KI-Prognose für {players.find((p) => p.id === player1Id)?.name}</strong>: {(aiWinProbability1 * 100).toFixed(2)}% Gewinnchance (KI)
                            </p>
                            <p className={styles.winProbability}>
                                <strong>KI-Prognose für {players.find((p) => p.id === player2Id)?.name}</strong>: {(aiWinProbability2 * 100).toFixed(2)}% Gewinnchance (KI)
                            </p>
                        </MessageBar>
                    </div>
                )}

                <div className={styles.formRow}>
                    <TextField
                        label="Score Spieler 1"
                        type="number"
                        value={score1.toString()}
                        onChange={(e, newValue) => setScore1(Number(newValue))}
                        className={styles.formField}
                    />
                    <TextField
                        label="Score Spieler 2"
                        type="number"
                        value={score2.toString()}
                        onChange={(e, newValue) => setScore2(Number(newValue))}
                        className={styles.formField}
                    />
                </div>

                {errorMessage && (
                    <MessageBar messageBarType={MessageBarType.error}>{errorMessage}</MessageBar>
                )}
            </div>
            <DialogFooter>
                <PrimaryButton onClick={handleSave} text="Speichern" />
                <DefaultButton onClick={onDismiss} text="Abbrechen" />
            </DialogFooter>
        </Dialog>
    );
};

export default AddMatchDialog;
