import * as React from 'react';
import { useAppDispatch, useAppSelector } from '../../../core/state/hook';
import { fetchPlayers } from '../../../core/state/playerSlice';
import { DetailsList, IColumn, DetailsListLayoutMode, SelectionMode } from '@fluentui/react/lib/DetailsList';
import { PrimaryButton } from '@fluentui/react/lib/Button';
import styles from './SbsTableTennis.module.scss';
import { ISbsTableTennisProps } from './ISbsTableTennisProps';
import AddMatchDialog from './AddMatchDialog';
import { recalculateRankings } from '../../../core/state/matchSlice';
import { Link } from '@fluentui/react/lib/Link';
import { IPlayer } from '../../../core/entities/Player';
import PlayerStatsDialog from './costumComponents/PlayerStatsDialog';

const SbsTableTennis = (props: ISbsTableTennisProps) => {
  const dispatch = useAppDispatch();
  const players = useAppSelector((state) => state.player.players);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedPlayer, setSelectedPlayer] = React.useState<IPlayer | null>(null);

  const sortedPlayers = [...players].sort((a, b) => b.rankingPoints - a.rankingPoints);

  React.useEffect(() => {
    dispatch(fetchPlayers());
  }, [dispatch]);

  const handlePlayerClick = (player: IPlayer) => {
    setSelectedPlayer(player);
  };

  const closePlayerDialog = () => {
    setSelectedPlayer(null);
  };

  const columns: IColumn[] = [
    {
      key: 'column1',
      name: 'Name',
      fieldName: 'name',
      minWidth: 150,
      maxWidth: 200,
      isResizable: true,
      onRender: (item: IPlayer) => (
        <Link onClick={() => handlePlayerClick(item)}>{item.name}</Link>
      ),
    },
    { key: 'column2', name: 'Rangpunkte', fieldName: 'rankingPoints', minWidth: 50, maxWidth: 100, isResizable: true, data: 'number', isMultiline: true },
    { key: 'column3', name: 'Gesamt', fieldName: 'gesamt', minWidth: 50, maxWidth: 100, isResizable: true, data: 'number' },
    { key: 'column4', name: 'Siege', fieldName: 'wins', minWidth: 50, maxWidth: 100, isResizable: true, data: 'number' },
    { key: 'column5', name: 'Niederlagen', fieldName: 'losses', minWidth: 50, maxWidth: 100, isResizable: true, data: 'number' },
    { key: 'column6', name: 'Satzdifferenz', fieldName: 'setDifference', minWidth: 50, maxWidth: 100, isResizable: true, data: 'number' }
  ];

  const handleRecalculate = () => {
    dispatch(recalculateRankings());
  };

  return (
    <div>
      <h1>Leaderboard</h1>
      <DetailsList
        items={sortedPlayers}
        columns={columns}
        setKey="set"
        layoutMode={DetailsListLayoutMode.fixedColumns}
        selectionMode={SelectionMode.none}
        selectionPreservedOnEmptyClick={true}
        ariaLabelForSelectionColumn="Toggle selection"
        ariaLabelForSelectAllCheckbox="Toggle selection for all items"
        styles={{ root: { width: '100%' } }}
      />
      <PrimaryButton className={styles.button} text="Add Match" onClick={() => setIsDialogOpen(true)} />
      <PrimaryButton className={styles.button} text="Recalculate Rankings" onClick={handleRecalculate} />
      <AddMatchDialog isOpen={isDialogOpen} onDismiss={async () => setIsDialogOpen(false)} />
      {selectedPlayer && (
        <PlayerStatsDialog player={selectedPlayer} onDismiss={closePlayerDialog} />
      )}
    </div>
  );
};

export default SbsTableTennis;
