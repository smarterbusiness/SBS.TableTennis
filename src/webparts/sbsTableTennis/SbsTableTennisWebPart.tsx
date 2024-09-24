import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  IPropertyPaneConfiguration,
  PropertyPaneTextField
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import * as strings from 'SbsTableTennisWebPartStrings';
import App from './components/App';
import { Provider } from 'react-redux';
import { store } from '../../core/state/store';
import SPServiceProvider from '../../core/services/SPService/SPServiceProvider';

export interface ISbsTableTennisWebPartProps {
  description: string;
}

export default class SbsTableTennisWebPart extends BaseClientSideWebPart<ISbsTableTennisWebPartProps> {

  public render(): void {
    SPServiceProvider.initialize(this.context);
    ReactDom.render(
      <Provider store={store}>
        <App context={this.context} />
      </Provider>,
      this.domElement
    );
  }


  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription
          },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneTextField('description', {
                  label: strings.DescriptionFieldLabel
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
