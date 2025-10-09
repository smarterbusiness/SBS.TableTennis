// src/components/costumComponents/PlayerStatsDialog.tsx
import * as React from 'react';
import { useEffect } from 'react';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { DefaultButton, Spinner, SpinnerSize } from '@fluentui/react';
import { Pivot, PivotItem } from '@fluentui/react/lib/Pivot';
import { LineChart, ILineChartDataPoint } from '@fluentui/react-charting';
import { Icon } from '@fluentui/react/lib/Icon';
import { useAppDispatch, useAppSelector } from '../../../../core/state/hook';
import {
    fetchPlayerEloHistory,
    calculateAvgMargin,
    calculateWinningStreak,
    calculateRecentWinRate,
    fetchAllTimeEloHistory,
    getPlayerMatches
} from '../../../../core/state/playerSlice';
import { IPlayer } from '../../../../core/entities/Player';
import styles from './PlayerStatsDialog.module.scss';

interface PlayerStatsDialogProps {
    player: IPlayer;
    onDismiss: () => void;
}

const PlayerStatsDialog: React.FC<PlayerStatsDialogProps> = ({ player, onDismiss }) => {
    const dispatch = useAppDispatch();

    // Für "Aktuell" nutzen wir die ELO-Historie (z. B. des aktuellen Monats)
    const eloHistory = useAppSelector((state) => state.player.eloHistory[player.id]);
    const allTimeEloHistory = useAppSelector((state) => state.player.allTimeEloHistory[player.id]);
    const allTimeMatches = useAppSelector((state) => state.player.allTimeMatches);
    const computedStats = useAppSelector((state) => state.player.computedStats[player.id]);
    const isLoadingEloHistory = useAppSelector((state) => state.player.isLoadingEloHistory);

    // Lade ELO-Historie und All-Time Matches beim Öffnen
    useEffect(() => {
        dispatch(fetchPlayerEloHistory(player.id));
    }, [dispatch, player.id]);

    useEffect(() => {
        dispatch(fetchAllTimeEloHistory(player.id));
        dispatch(getPlayerMatches(player.id));
    }, [dispatch, player.id]);

    // Lade die Zusatzstatistiken (Winning Streak, Recent Win Rate, Avg. Margin)
    useEffect(() => {
        dispatch(calculateAvgMargin(player.id));
        dispatch(calculateWinningStreak(player.id));
        dispatch(calculateRecentWinRate(player.id));
    }, [dispatch, player.id]);

    // Erstelle Datenpunkte für den "Aktuell" Graph
    const currentDataPoints: ILineChartDataPoint[] = eloHistory
        ? eloHistory.map((item) => ({
            x: item.matchNumber,
            y: item.elo,
        }))
        : [];

    // Erstelle Datenpunkte für den "All-Time" Graph
    // Falls match.matchNumber nicht vorhanden ist, wird index+1 als X-Wert genutzt.
    const allTimeDataPoints: ILineChartDataPoint[] = allTimeEloHistory
        ? allTimeEloHistory.map((item) => ({
            x: item.matchNumber,
            y: item.elo,
        }))
        : [];


    // Hilfsfunktion zum Rendern der Statistikkarten; 
    // Der Parameter isAllTime entscheidet, welcher Datensatz genutzt wird.
    const renderStatsCards = (isAllTime: boolean) => {
        const titleSuffix = isAllTime ? '(All-Time)' : '(Aktuell)';
        const statsDataPoints = isAllTime ? allTimeDataPoints : currentDataPoints;
        const yValues = statsDataPoints.map((point) => point.y);
        const dynamicYMin = yValues.length ? Math.min(...yValues) - 20 : 800;
        const dynamicYMax = yValues.length ? Math.max(...yValues) + 20 : 1200;

        const totalMatches = isAllTime ? allTimeMatches.length : player.gesamt;
        const wins = isAllTime ? allTimeMatches.filter(match => match.winnerId === player.id).length : player.wins;
        const losses = isAllTime ? allTimeMatches.filter(match => match.winnerId !== player.id).length : player.losses;
        const setDifference = isAllTime
            ? allTimeMatches.reduce((acc, match) => {
                if (match.winnerId === player.id) {
                    return acc + (match.score1 - match.score2);
                } else {
                    return acc + (match.score2 - match.score1);
                }
            }, 0)
            : player.setDifference;

        return (
            <div className={styles.cardContainer}>
                <div className={styles.card}>
                    <h3>Grundstatistiken {titleSuffix}</h3>
                    <p><strong>ELO:</strong> {player.rankingPoints}</p>
                    <p><strong>Gesamtspiele:</strong> {totalMatches}</p>
                    <p><strong>Siege:</strong> {wins}</p>
                    <p><strong>Niederlagen:</strong> {losses}</p>
                    <p><strong>Satzdifferenz:</strong> {setDifference}</p>
                </div>
                {computedStats ? (
                    <div className={styles.card}>
                        <h3>Zusatzstatistiken {titleSuffix}</h3>
                        <p>
                            <strong>Winning Streak:</strong> {computedStats.winningStreak}{' '}
                            {computedStats.winningStreak > 0 && (
                                <Icon
                                    iconName="Flame"
                                    style={{ color: 'red', marginLeft: '8px' }}
                                    title="Aktuelle Siegesserie"
                                />
                            )}
                        </p>
                        <p>
                            <strong>Recent Win Rate:</strong>{' '}
                            {(computedStats.recentWinRate * 100).toFixed(2)}%
                        </p>
                        <p>
                            <strong>Avg. Margin:</strong> {computedStats.avgMargin.toFixed(2)}
                        </p>
                    </div>
                ) : (
                    <div className={styles.card}>
                        <Spinner label="Berechne Zusatzstatistiken..." size={SpinnerSize.medium} />
                    </div>
                )}
                <div className={`${styles.card} ${styles.graphCard}`}>
                    <h3>ELO-Entwicklung {titleSuffix}</h3>
                    {(!isAllTime && isLoadingEloHistory) ? (
                        <Spinner label="Lade ELO-Historie..." size={SpinnerSize.medium} />
                    ) : (
                        <LineChart
                            data={{
                                chartTitle: `ELO-Entwicklung ${titleSuffix}`,
                                lineChartData: [
                                    {
                                        legend: 'ELO-Wertung',
                                        data: statsDataPoints,
                                        color: '#0078D4',
                                    },
                                ],
                            }}
                            height={300}
                            width={600}
                            yAxisTickCount={10}
                            yAxisTickFormat={(tick: number) => tick.toString()}
                            yMinValue={dynamicYMin}
                            yMaxValue={dynamicYMax}
                        />
                    )}
                </div>
            </div>
        );
    };

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
            <Pivot>
                <PivotItem headerText="Aktuelle Stats">
                    {renderStatsCards(false)}
                </PivotItem>
                <PivotItem headerText="All-Time Stats">
                    {renderStatsCards(true)}
                </PivotItem>
            </Pivot>
            <DialogFooter>
                <DefaultButton onClick={onDismiss} text="Schließen" />
            </DialogFooter>
        </Dialog>
    );
};

export default PlayerStatsDialog;
