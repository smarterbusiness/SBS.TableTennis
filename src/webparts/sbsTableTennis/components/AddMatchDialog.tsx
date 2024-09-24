import * as React from 'react';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { TextField } from '@fluentui/react/lib/TextField';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { useAppDispatch, useAppSelector } from '../../../core/state/hook';
import { addMatch } from '../../../core/state/matchSlice';
import { IMatch } from '../../../core/entities/Match';

export interface IAddMatchDialogProps {
    isOpen: boolean,
    onDismiss: () => {}
};

const AddMatchDialog = (props: IAddMatchDialogProps) => {
    const dispatch = useAppDispatch();
    const players = useAppSelector((state) => state.player.players);
    const { isOpen, onDismiss } = props;
    const [player1Id, setPlayer1Id] = React.useState<number | undefined>();
    const [player2Id, setPlayer2Id] = React.useState<number | undefined>();
    const [score1, setScore1] = React.useState<number>(0);
    const [score2, setScore2] = React.useState<number>(0);

    const playerOptions: IDropdownOption[] = players.map((player) => ({
        key: player.id,
        text: player.name
    }));

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
            alert('Bitte geben Sie gültige Daten ein.');
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
        >
            <Dropdown
                placeholder="Wählen Sie Spieler 1"
                label="Spieler 1"
                options={playerOptions}
                onChange={(e, option) => setPlayer1Id(option?.key as number)}
            />
            <Dropdown
                placeholder="Wählen Sie Spieler 2"
                label="Spieler 2"
                options={playerOptions}
                onChange={(e, option) => setPlayer2Id(option?.key as number)}
            />
            <TextField
                label="Score Spieler 1"
                type="number"
                value={score1.toString()}
                onChange={(e, newValue) => setScore1(Number(newValue))}
            />
            <TextField
                label="Score Spieler 2"
                type="number"
                value={score2.toString()}
                onChange={(e, newValue) => setScore2(Number(newValue))}
            />
            <DialogFooter>
                <PrimaryButton onClick={handleSave} text="Speichern" />
                <DefaultButton onClick={onDismiss} text="Abbrechen" />
            </DialogFooter>
        </Dialog>
    );
};

export default AddMatchDialog;
