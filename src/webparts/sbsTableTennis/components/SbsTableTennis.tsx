import * as React from 'react';
import { useAppDispatch, useAppSelector } from '../../../core/state/hook';
import { fetchPlayers, getPlayersForMonth } from '../../../core/state/playerSlice';
import {
  DetailsList,
  IColumn,
  DetailsListLayoutMode,
  SelectionMode,
  IDetailsRowProps
} from '@fluentui/react/lib/DetailsList';
import { PrimaryButton } from '@fluentui/react/lib/Button';
import { Link } from '@fluentui/react/lib/Link';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './SbsTableTennis.module.scss';
import { ISbsTableTennisProps } from './ISbsTableTennisProps';
import { recalculateRankings } from '../../../core/state/matchSlice';
import { IPlayer } from '../../../core/entities/Player';
import PlayerStatsDialog from './costumComponents/PlayerStatsDialog';
import AddMatchDialog from './AddMatchDialog';
import * as strings from 'SbsTableTennisWebPartStrings';

const SbsTableTennis = (props: ISbsTableTennisProps) => {
  const dispatch = useAppDispatch();
  const players = useAppSelector((state) => state.player.players);
  const prevPlayers = useAppSelector((state) => state.player.prevPlayers);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedPlayer, setSelectedPlayer] = React.useState<IPlayer | null>(null);

  // Aktuelle Spieler laden und gleichzeitig die Vormonatswerte holen
  React.useEffect(() => {
    dispatch(fetchPlayers());

    const fetchPrevPlayers = async () => {
      const now = new Date();
      let month = now.getUTCMonth();
      if (month === 0) {
        month = 11;
      } else {
        month--;
      }
      dispatch(getPlayersForMonth(month));
    };
    fetchPrevPlayers();
  }, [dispatch]);

  // Sortiere aktuelle Spieler absteigend nach Rangpunkten (Index 0 entspricht Platz 1)
  const sortedPlayers = [...players].sort(
    (a, b) => b.rankingPoints - a.rankingPoints
  );
  // Auch die Vormonatswerte sortieren
  const sortedPrevPlayers = React.useMemo(() => {
    return [...prevPlayers].sort((a, b) => b.rankingPoints - a.rankingPoints);
  }, [prevPlayers]);

  const handlePlayerClick = (player: IPlayer) => {
    setSelectedPlayer(player);
  };

  const closePlayerDialog = () => {
    setSelectedPlayer(null);
  };

  const columns: IColumn[] = [
    {
      key: 'rank',
      name: '',
      fieldName: 'rank',
      minWidth: 30,
      maxWidth: 30,
      isResizable: false,
      onRender: (_item: IPlayer, index?: number) => {
        if (index === undefined || index > 2) return null;
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
        const label = index === 0 ? strings.MedalFirstPlaceAria : index === 1 ? strings.MedalSecondPlaceAria : strings.MedalThirdPlaceAria;
        return (
          <span role="img" aria-label={label} style={{ display: 'block', textAlign: 'center' }}>{medal}</span>
        );
      },
    },
    {
      // Diese schmale Spalte zeigt den Positionsunterschied als farbigen Pfeil an
      key: 'columnMovement',
      name: '', // kein Headertext
      minWidth: 20,
      maxWidth: 30,
      isResizable: false,
      onRender: (item: IPlayer) => {
        // Ermittle den aktuellen Rang (Index in der sortierten Liste)
        const currentIndex = sortedPlayers.findIndex((p) => p.id === item.id);
        // Ermittle den Rang im Vormonat
        const prevIndex = sortedPrevPlayers.findIndex((p) => p.id === item.id);

        // Standardmäßig wird angenommen, dass keine Änderung vorliegt.
        let delta = 0;
        if (prevIndex !== -1 && currentIndex !== -1) {
          delta = prevIndex - currentIndex;
        }
        if (delta > 0) {
          return (
            <div style={{ textAlign: 'center' }}>
              <Icon
                iconName="ChevronUp"
                style={{ color: 'green' }}
                title={`Gestiegen um ${delta} Plätze`}
              />
            </div>
          );
        } else if (delta < 0) {
          return (
            <div style={{ textAlign: 'center' }}>
              <Icon
                iconName="ChevronDown"
                style={{ color: 'red' }}
                title={`Gefallen um ${Math.abs(delta)} Plätze`}
              />
            </div>
          );
        } else {
          return (
            <div style={{ textAlign: 'center' }}>
              <Icon
                iconName="Remove"
                style={{ color: 'gray' }}
                title="Keine Änderung"
              />
            </div>
          );
        }
      },
    },
    {
      key: 'columnName',
      name: strings.ColumnName,
      fieldName: 'name',
      minWidth: 150,
      maxWidth: 200,
      isResizable: true,
      onRender: (item: IPlayer) => (
        <Link onClick={() => handlePlayerClick(item)}>{item.name}</Link>
      ),
    },
    {
      key: 'columnRankingPoints',
      name: strings.ColumnRankingPoints,
      fieldName: 'rankingPoints',
      minWidth: 50,
      maxWidth: 100,
      isResizable: true,
      data: 'number',
      isMultiline: true,
    },
    {
      key: 'columnGesamt',
      name: strings.ColumnTotal,
      fieldName: 'gesamt',
      minWidth: 50,
      maxWidth: 100,
      isResizable: true,
      data: 'number',
    },
    {
      key: 'columnWins',
      name: strings.ColumnWins,
      fieldName: 'wins',
      minWidth: 50,
      maxWidth: 100,
      isResizable: true,
      data: 'number',
    },
    {
      key: 'columnLosses',
      name: strings.ColumnLosses,
      fieldName: 'losses',
      minWidth: 50,
      maxWidth: 100,
      isResizable: true,
      data: 'number',
    },
    {
      key: 'columnSetDiff',
      name: strings.ColumnSetDifference,
      fieldName: 'setDifference',
      minWidth: 50,
      maxWidth: 100,
      isResizable: true,
      data: 'number',
    },
  ];

  const handleRecalculate = () => {
    dispatch(recalculateRankings());
  };

  const onRenderRow = (props?: IDetailsRowProps, defaultRender?: (props?: IDetailsRowProps) => JSX.Element | null) => {
    if (!props || !defaultRender) return null;
    let className = props.className || '';
    if (props.itemIndex === 0) className = `${className} ${styles.goldRow}`.trim();
    else if (props.itemIndex === 1) className = `${className} ${styles.silverRow}`.trim();
    else if (props.itemIndex === 2) className = `${className} ${styles.bronzeRow}`.trim();
    return defaultRender({ ...props, className });
  };

  return (
    <div>
      <h1>{strings.LeaderboardTitle}</h1>
      <DetailsList
        items={sortedPlayers}
        columns={columns}
        setKey="set"
        layoutMode={DetailsListLayoutMode.fixedColumns}
        onRenderRow={onRenderRow}
        selectionMode={SelectionMode.none}
        selectionPreservedOnEmptyClick={true}
        ariaLabelForSelectionColumn={strings.AriaToggleSelection}
        ariaLabelForSelectAllCheckbox={strings.AriaToggleSelectionAll}
        styles={{ root: { width: '100%' } }}
      />
      <PrimaryButton
        className={styles.button}
        text={strings.AddMatchButton}
        onClick={() => setIsDialogOpen(true)}
      />
      <PrimaryButton
        className={styles.button}
        text={strings.RecalculateRankingsButton}
        onClick={handleRecalculate}
      />
      <AddMatchDialog
        isOpen={isDialogOpen}
        onDismiss={() => setIsDialogOpen(false)}
        context={props.context}
      />
      {selectedPlayer && (
        <PlayerStatsDialog player={selectedPlayer} onDismiss={closePlayerDialog} />
      )}
    </div>
  );
};

export default SbsTableTennis;
