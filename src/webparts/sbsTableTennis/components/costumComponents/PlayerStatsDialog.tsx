import * as React from 'react';
import { useEffect, useMemo } from 'react';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { DefaultButton, Spinner, SpinnerSize } from '@fluentui/react';
import { Pivot, PivotItem } from '@fluentui/react/lib/Pivot';
import { LineChart, ILineChartDataPoint } from '@fluentui/react-charting';
import { Icon } from '@fluentui/react/lib/Icon';
import { Text } from '@fluentui/react/lib/Text';
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
import * as strings from 'SbsTableTennisWebPartStrings';
import styles from './PlayerStatsDialog.module.scss';

interface PlayerStatsDialogProps {
    player: IPlayer;
    onDismiss: () => void;
}

interface PlayerStatistics {
    totalGames: number;
    wins: number;
    losses: number;
    setDifference: number;
    winRate: number;
}

const PlayerStatsDialog: React.FC<PlayerStatsDialogProps> = ({ player, onDismiss }) => {
    const dispatch = useAppDispatch();

    // Selector hooks
    const eloHistory = useAppSelector((state) => state.player.eloHistory[player.id]);
    const allTimeEloHistory = useAppSelector((state) => state.player.allTimeEloHistory[player.id]);
    const allTimeMatches = useAppSelector((state) => state.player.allTimeMatches);
    const computedStats = useAppSelector((state) => state.player.computedStats[player.id]);
    const isLoadingEloHistory = useAppSelector((state) => state.player.isLoadingEloHistory);

    // Calculate statistics for AllTime view
    const allTimeStats = useMemo((): PlayerStatistics => {
        const playerMatches = allTimeMatches.filter(match => 
            match.player1Id === player.id || match.player2Id === player.id
        );
        
        const wins = playerMatches.filter(match => match.winnerId === player.id).length;
        const totalGames = playerMatches.length;
        const losses = totalGames - wins;
        
        const setDifference = playerMatches.reduce((acc, match) => {
            if (match.player1Id === player.id) {
                // Player is player1: their score - opponent score
                return acc + (match.score1 - match.score2);
            } else {
                // Player is player2: their score - opponent score
                return acc + (match.score2 - match.score1);
            }
        }, 0);
        
        return {
            totalGames,
            wins,
            losses,
            setDifference,
            winRate: totalGames > 0 ? wins / totalGames : 0
        };
    }, [allTimeMatches, player.id]);

    // Current month statistics (use existing player data)
    const currentStats = useMemo((): PlayerStatistics => ({
        totalGames: player.gesamt,
        wins: player.wins,
        losses: player.losses,
        setDifference: player.setDifference,
        winRate: player.gesamt > 0 ? player.wins / player.gesamt : 0
    }), [player]);

    // Data loading
    useEffect(() => {
        dispatch(fetchPlayerEloHistory(player.id));
        dispatch(fetchAllTimeEloHistory(player.id));
        dispatch(getPlayerMatches(player.id));
        dispatch(calculateAvgMargin(player.id));
        dispatch(calculateWinningStreak(player.id));
        dispatch(calculateRecentWinRate(player.id));
    }, [dispatch, player.id]);

    // String formatting utility
    const fmt = (s: string, ...args: any[]): string => 
        s.replace(/\{(\d+)\}/g, (_m, i) => String(args[i]));

    // Chart data points
    const currentDataPoints: ILineChartDataPoint[] = useMemo(() => 
        eloHistory?.map((item, index) => ({
            x: index + 1,
            y: item.elo
        })) ?? [], [eloHistory]);

    const allTimeDataPoints: ILineChartDataPoint[] = useMemo(() => 
        allTimeEloHistory?.map((item, index) => ({
            x: index + 1,
            y: item.elo
        })) ?? [], [allTimeEloHistory]);


    // Get ELO rating classification
    const getEloClassification = (elo: number) => {
        if (elo >= 1400) return { label: 'Master', color: '#ffd700', icon: 'Crown' };
        if (elo >= 1200) return { label: 'Expert', color: '#c0392b', icon: 'Trophy2' };
        if (elo >= 1100) return { label: 'Advanced', color: '#8e44ad', icon: 'Medal' };
        if (elo >= 1000) return { label: 'Intermediate', color: '#2980b9', icon: 'SkypeCircleCheck' };
        return { label: 'Beginner', color: '#27ae60', icon: 'PlayerSettings' };
    };

    // Modern stats rendering
    const renderStats = (isAllTime: boolean) => {
        const stats = isAllTime ? allTimeStats : currentStats;
        const dataPoints = isAllTime ? allTimeDataPoints : currentDataPoints;
        const viewType = isAllTime ? 'All-Time' : 'Current Month';
        
        if (isLoadingEloHistory && !isAllTime) {
            return (
                <div className={styles.loadingContainer}>
                    <Spinner size={SpinnerSize.large} label="Loading player statistics..." />
                </div>
            );
        }

        const eloClass = getEloClassification(player.rankingPoints);
        const yValues = dataPoints.map(point => point.y);
        const dynamicYMin = yValues.length ? Math.min(...yValues) - 50 : 800;
        const dynamicYMax = yValues.length ? Math.max(...yValues) + 50 : 1400;

        return (
            <div className={styles.modernStatsContainer}>
                {/* Player Header with ELO Classification */}
                <div className={styles.playerHeader}>
                    <div className={styles.playerInfo}>
                        <div className={styles.playerAvatar}>
                            <Icon iconName="Contact" className={styles.avatarIcon} />
                        </div>
                        <div className={styles.playerDetails}>
                            <Text variant="xLarge" className={styles.playerName}>{player.name}</Text>
                            <div className={styles.eloDisplay}>
                                <Icon iconName={eloClass.icon} style={{ color: eloClass.color, marginRight: '8px' }} />
                                <Text variant="large" style={{ color: eloClass.color, fontWeight: '700' }}>
                                    {player.rankingPoints} ELO
                                </Text>
                            </div>
                            <Text variant="medium" className={styles.viewType}>{viewType} Statistics</Text>
                        </div>
                    </div>
                </div>

                {/* Key Metrics Grid */}
                <div className={styles.metricsGrid}>
                    <div className={styles.metricCard}>
                        <div className={styles.metricIcon}>
                            <Icon iconName="NumberSymbol" style={{color: '#0078d4'}} />
                        </div>
                        <div className={styles.metricContent}>
                            <div className={styles.metricValue}>{stats.totalGames}</div>
                            <div className={styles.metricLabel}>Total Matches</div>
                        </div>
                    </div>
                    
                    <div className={styles.metricCard}>
                        <div className={styles.metricIcon}>
                            <Icon iconName="CheckMark" style={{color: '#107c10'}} />
                        </div>
                        <div className={styles.metricContent}>
                            <div className={styles.metricValue} style={{color: '#107c10'}}>{stats.wins}</div>
                            <div className={styles.metricLabel}>Victories</div>
                        </div>
                    </div>
                    
                    <div className={styles.metricCard}>
                        <div className={styles.metricIcon}>
                            <Icon iconName="StatusErrorFull" style={{color: '#d13438'}} />
                        </div>
                        <div className={styles.metricContent}>
                            <div className={styles.metricValue} style={{color: '#d13438'}}>{stats.losses}</div>
                            <div className={styles.metricLabel}>Defeats</div>
                        </div>
                    </div>
                    
                    <div className={styles.metricCard}>
                        <div className={styles.metricIcon}>
                            <Icon iconName="Trophy2" style={{color: '#ffa500'}} />
                        </div>
                        <div className={styles.metricContent}>
                            <div className={styles.metricValue} style={{color: '#0078d4'}}>
                                {(stats.winRate * 100).toFixed(1)}%
                            </div>
                            <div className={styles.metricLabel}>Win Rate</div>
                        </div>
                    </div>
                    
                    <div className={styles.metricCard}>
                        <div className={styles.metricIcon}>
                            <Icon iconName={stats.setDifference >= 0 ? 'TrendingUp' : 'TrendingDown'} 
                                  style={{color: stats.setDifference >= 0 ? '#107c10' : '#d13438'}} />
                        </div>
                        <div className={styles.metricContent}>
                            <div className={styles.metricValue} 
                                 style={{color: stats.setDifference >= 0 ? '#107c10' : '#d13438'}}>
                                {stats.setDifference > 0 ? `+${stats.setDifference}` : stats.setDifference}
                            </div>
                            <div className={styles.metricLabel}>Set Difference</div>
                        </div>
                    </div>
                </div>

                {/* Advanced Metrics */}
                {computedStats && (
                    <div className={styles.advancedMetrics}>
                        <Text variant="large" className={styles.sectionTitle}>Performance Insights</Text>
                        <div className={styles.insightsGrid}>
                            <div className={styles.insightCard}>
                                <div className={styles.insightHeader}>
                                    <Icon iconName="Flame" style={{color: '#d13438', marginRight: '8px'}} />
                                    <Text variant="medium" className={styles.insightTitle}>Current Streak</Text>
                                </div>
                                <div className={styles.insightValue}>
                                    {computedStats.winningStreak > 0 ? 
                                        `${computedStats.winningStreak} wins in a row` : 
                                        'No active winning streak'
                                    }
                                </div>
                            </div>
                            
                            <div className={styles.insightCard}>
                                <div className={styles.insightHeader}>
                                    <Icon iconName="RecentItem" style={{color: '#00bcf2', marginRight: '8px'}} />
                                    <Text variant="medium" className={styles.insightTitle}>Recent Form</Text>
                                </div>
                                <div className={styles.insightValue}>
                                    {(computedStats.recentWinRate * 100).toFixed(0)}% win rate (last 5 games)
                                </div>
                            </div>
                            
                            <div className={styles.insightCard}>
                                <div className={styles.insightHeader}>
                                    <Icon iconName="BarChart4" style={{color: '#8764b8', marginRight: '8px'}} />
                                    <Text variant="medium" className={styles.insightTitle}>Average Dominance</Text>
                                </div>
                                <div className={styles.insightValue}>
                                    {computedStats.avgMargin.toFixed(1)} sets per win
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ELO History Chart */}
                {dataPoints.length > 0 && (
                    <div className={styles.chartContainer}>
                        <Text variant="large" className={styles.sectionTitle}>
                            ELO Progression - {viewType}
                        </Text>
                        <div className={styles.chartWrapper}>
                            <LineChart
                                data={{
                                    chartTitle: `ELO Development (${viewType})`,
                                    lineChartData: [{
                                        legend: 'ELO Rating',
                                        data: dataPoints,
                                        color: '#0078D4',
                                        lineOptions: {
                                            lineBorderWidth: 3
                                        }
                                    }]
                                }}
                                height={280}
                                width={650}
                                yAxisTickCount={8}
                                yMinValue={dynamicYMin}
                                yMaxValue={dynamicYMax}
                                showXAxisLablesTooltip
                                enabledLegendsWrapLines={true}
                                allowMultipleShapesForPoints={true}
                                optimizeLargeData={true}
                            />
                        </div>
                        {dataPoints.length > 1 && (
                            <div className={styles.chartInsights}>
                                <div className={styles.chartStat}>
                                    <Text variant="small">Peak: {Math.max(...yValues)}</Text>
                                </div>
                                <div className={styles.chartStat}>
                                    <Text variant="small">Low: {Math.min(...yValues)}</Text>
                                </div>
                                <div className={styles.chartStat}>
                                    <Text variant="small">Range: {Math.max(...yValues) - Math.min(...yValues)} points</Text>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <Dialog
            hidden={false}
            onDismiss={onDismiss}
            dialogContentProps={{
                type: DialogType.largeHeader,
                title: fmt(strings.PlayerStatsTitle, player.name),
                showCloseButton: true
            }}
            modalProps={{
                isBlocking: false,
                className: styles.playerDialog
            }}
            minWidth={800}
            maxWidth={1000}
        >
            <div className={styles.dialogContent}>
                <Pivot className={styles.statsPivot}>
                    <PivotItem 
                        headerText="Current Month"
                        itemIcon="Calendar"
                        className={styles.pivotItem}
                    >
                        {renderStats(false)}
                    </PivotItem>
                    <PivotItem 
                        headerText="All Time"
                        itemIcon="History"
                        className={styles.pivotItem}
                    >
                        {renderStats(true)}
                    </PivotItem>
                </Pivot>
            </div>
            <DialogFooter className={styles.dialogFooter}>
                <DefaultButton 
                    onClick={onDismiss} 
                    text={strings.Close}
                    iconProps={{ iconName: 'Cancel' }}
                />
            </DialogFooter>
        </Dialog>
    );
};

export default PlayerStatsDialog;

