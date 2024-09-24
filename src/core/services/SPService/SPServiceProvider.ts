import SPService from './implementations/SPService';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { ISPService } from './ISPService';

class SPServiceProvider {
    private static _serviceInstance: ISPService;

    public static initialize(context: WebPartContext): void {
        if (!this._serviceInstance) {
            this._serviceInstance = new SPService(context);
            console.log('SPServiceProvider initialized');
        }
    }

    public static GetService(): ISPService {
        if (!this._serviceInstance) {
            throw new Error('SPService not initialized. Call initialize() first.');
        }
        return this._serviceInstance;
    }
}

export default SPServiceProvider;