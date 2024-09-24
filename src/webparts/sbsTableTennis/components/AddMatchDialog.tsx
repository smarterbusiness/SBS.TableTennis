import * as React from 'react';
import { useEffect } from 'react';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { TextField } from '@fluentui/react/lib/TextField';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { useAppDispatch, useAppSelector } from '../../../core/state/hook';
import { addMatch } from '../../../core/state/matchSlice';
import { IMatch } from '../../../core/entities/Match';
import styles from './SbsTableTennis.module.scss';
import { MessageBar, MessageBarType } from '@fluentui/react';

export interface IAddMatchDialogProps {
    isOpen: boolean;
    onDismiss: () => void;
}

const AddMatchDialog = (props: IAddMatchDialogProps) => {
    const dispatch = useAppDispatch();
    const players = useAppSelector((state) => state.player.players);
    const { isOpen, onDismiss } = props;
    const [player1Id, setPlayer1Id] = React.useState<number | undefined>();
    const [player2Id, setPlayer2Id] = React.useState<number | undefined>();
    const [score1, setScore1] = React.useState<number>(0);
    const [score2, setScore2] = React.useState<number>(0);

    const [winProbability1, setWinProbability1] = React.useState<number | null>(null);
    const [winProbability2, setWinProbability2] = React.useState<number | null>(null);

    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

    const playerOptions: IDropdownOption[] = players.map((player) => ({
        key: player.id,
        text: player.name
    }));

    // **Neuer useEffect-Hook zum Zurücksetzen der Zustandsvariablen beim Öffnen des Dialogs**
    useEffect(() => {
        if (isOpen) {
            // Zustandsvariablen zurücksetzen
            setPlayer1Id(undefined);
            setPlayer2Id(undefined);
            setScore1(0);
            setScore2(0);
            setWinProbability1(null);
            setWinProbability2(null);
            setErrorMessage(null);
        }
    }, [isOpen]);

    const calculateWinProbabilities = (player1Id: number, player2Id: number) => {
        const player1 = players.find(p => p.id === player1Id);
        const player2 = players.find(p => p.id === player2Id);

        if (player1 && player2) {
            const R_A = player1.rankingPoints;
            const R_B = player2.rankingPoints;

            const E_A = 1 / (1 + Math.pow(10, (R_B - R_A) / 400));
            const E_B = 1 - E_A;

            setWinProbability1(E_A);
            setWinProbability2(E_B);
        }
    };

    const handlePlayer1Change = (e: React.FormEvent<HTMLDivElement>, option?: IDropdownOption) => {
        const selectedPlayer1Id = option?.key as number;
        setPlayer1Id(selectedPlayer1Id);

        if (selectedPlayer1Id && player2Id && selectedPlayer1Id !== player2Id) {
            calculateWinProbabilities(selectedPlayer1Id, player2Id);
            setErrorMessage(null);
        } else {
            setWinProbability1(null);
            setWinProbability2(null);
            if (selectedPlayer1Id === player2Id) {
                setErrorMessage('Spieler 1 und Spieler 2 dürfen nicht identisch sein.');
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
            if (player1Id === selectedPlayer2Id) {
                setErrorMessage('Spieler 1 und Spieler 2 dürfen nicht identisch sein.');
            }
        }
    };

    const handleSave = async () => {
        if (player1Id && player2Id && player1Id !== player2Id && (score1 >= 0) && (score2 >= 0)) {
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

            dispatch(addMatch(match));
            onDismiss();
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
                styles: { main: { maxWidth: 450 } }
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
                {winProbability1 !== null && winProbability2 !== null && (
                    <div className={styles.winProbabilities}>
                        <MessageBar messageBarType={MessageBarType.info}>
                            <p className={styles.winProbability}>
                                <strong>{players.find(p => p.id === player1Id)?.name}</strong>: {(winProbability1 * 100).toFixed(2)}% Gewinnchance
                            </p>
                            <p className={styles.winProbability}>
                                <strong>{players.find(p => p.id === player2Id)?.name}</strong>: {(winProbability2 * 100).toFixed(2)}% Gewinnchance
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
                    <MessageBar messageBarType={MessageBarType.error}>
                        {errorMessage}
                    </MessageBar>
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
