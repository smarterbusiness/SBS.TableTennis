import * as React from 'react';
import { useEffect } from 'react';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { DefaultButton, Spinner, SpinnerSize } from '@fluentui/react';
import { LineChart, ILineChartDataPoint } from '@fluentui/react-charting';
import { useAppDispatch, useAppSelector } from '../../../../core/state/hook';
import { fetchPlayerEloHistory } from '../../../../core/state/playerSlice';
import { IPlayer } from '../../../../core/entities/Player';
import * as strings from 'SbsTableTennisWebPartStrings';

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

    const fmt = (s: string, ...args: any[]) => s.replace(/\{(\d+)\}/g, (_m, i) => String(args[i]));

    return (
        <Dialog
            hidden={false}
            onDismiss={onDismiss}
            dialogContentProps={{
                type: DialogType.largeHeader,
                title: fmt(strings.PlayerStatsTitle, player.name),
            }}
            modalProps={{
                isBlocking: false,
            }}
            minWidth={600}
            maxWidth={800}
        >
            <div>
                <p>{strings.CurrentElo} {player.rankingPoints}</p>
                <p>{strings.TotalGames} {player.gesamt}</p>
                <p>{strings.Wins} {player.wins}</p>
                <p>{strings.Losses} {player.losses}</p>
                <p>{strings.SetDifference} {player.setDifference}</p>
            </div>
            {isLoading ? (
                <Spinner label={strings.LoadingEloHistory} size={SpinnerSize.medium} />
            ) : (
                <LineChart
                    data={{
                        chartTitle: strings.EloProgressThisMonth,
                        lineChartData: [
                            {
                                legend: strings.EloRatingLegend,
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
                <DefaultButton onClick={onDismiss} text={strings.Close} />
            </DialogFooter>
        </Dialog>
    );
};

export default PlayerStatsDialog;

