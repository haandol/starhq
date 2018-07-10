import * as _ from 'lodash';

export type Method = 'GET' | 'POST' | 'PUT' | 'DEL';

export namespace Metadata {
  export const Key = {
    Rest: 'Rest',
    Rpc: 'Rpc',
    WorkerEvent: 'WorkerEvent',
    FanoutEvent: 'FanoutEvent'
  }
  export const Keys = _.keys(Key);

  export interface Rest {
    method: string;
    uri: string;
    funcName: string;
    context: any;
  }

  export interface Rpc {
    funcName: string;
    context: any;
  }

  export interface Event {
    key: string;
    funcName: string;
  }

  export interface RestContext {
    route: string;
    context?: any;
  }
}