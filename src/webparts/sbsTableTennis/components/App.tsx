//make app.tsx
import * as React from 'react';
import { ISbsTableTennisProps } from './ISbsTableTennisProps';
import SbsTableTennis from './SbsTableTennis';
import SPServiceProvider from '../../../core/services/SPService/SPServiceProvider';

const App = (props: ISbsTableTennisProps) => {
    SPServiceProvider.initialize(props.context);
    return (
        <SbsTableTennis {...props} />
    );
}

export default App;