import * as React from 'react';
import { useEffect } from 'react';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { DefaultButton, Spinner, SpinnerSize } from '@fluentui/react';
import { LineChart, ILineChartDataPoint } from '@fluentui/react-charting';
import { useAppDispatch, useAppSelector } from '../../../../core/state/hook';
import { fetchPlayerEloHistory } from '../../../../core/state/playerSlice';
import { IPlayer } from '../../../../core/entities/Player';

interface PlayerStatsDialogProps {
    player: IPlayer;
    onDismiss: () => void;
}

const PlayerStatsDialog: React.FC<PlayerStatsDialogProps> = ({ player, onDismiss }) => {
    const dispatch = useAppDispatch();

    const eloHistory = useAppSelector((state) => state.player.eloHistory[player.id]);
    const isLoading = useAppSelector((state) => state.player.isLoadingEloHistory);

    useEffect(() => {
        dispatch(fetchPlayerEloHistory(player.id));
    }, [dispatch, player.id]);

    const dataPoints: ILineChartDataPoint[] = eloHistory
        ? eloHistory.map((item) => ({
            x: item.matchNumber,
            y: item.elo,
        }))
        : [];

    return (
        <Dialog
            hidden={false}
            onDismiss={onDismiss}
            dialogContentProps={{
                type: DialogType.largeHeader,
                title: `Statistiken für ${player.name}`,
            }}
            modalProps={{
                isBlocking: false,
            }}
            minWidth={600}
            maxWidth={800}
        >
            <div>
                <p>Aktuelle ELO-Wertung: {player.rankingPoints}</p>
                <p>Gesamtspiele: {player.gesamt}</p>
                <p>Siege: {player.wins}</p>
                <p>Niederlagen: {player.losses}</p>
                <p>Satzdifferenz: {player.setDifference}</p>
            </div>
            {isLoading ? (
                <Spinner label="Lade ELO-Historie..." size={SpinnerSize.medium} />
            ) : (
                <LineChart
                    data={{
                        chartTitle: 'ELO-Entwicklung im aktuellen Monat',
                        lineChartData: [
                            {
                                legend: 'ELO-Wertung',
                                data: dataPoints,
                                color: '#0078D4',
                            },
                        ],
                    }}
                    height={300}
                    width={600}
                    yAxisTickCount={10}
                    yAxisTickFormat={(tick: number) => tick.toString()}
                    yMaxValue={1200}
                    yMinValue={800}
                />
            )}
            <DialogFooter>
                <DefaultButton onClick={onDismiss} text="Schließen" />
            </DialogFooter>
        </Dialog>
    );
};

export default PlayerStatsDialog;
