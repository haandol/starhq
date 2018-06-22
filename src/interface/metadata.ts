import * as _ from 'lodash';

export type Method = 'GET' | 'POST' | 'PUT' | 'DEL';

export namespace Metadata {
  export const Key = {
    rest: 'rest',
    rpc: 'rpc',
    event: 'event'
  }
  export const Keys = _.keys(Key);

  export interface RestMetadata {
    method: string;
    uri: string;
    funcName: string;
    context: any;
  }

  export interface RpcMetadata {
    funcName: string;
    context: any;
  }

  export interface EventMetadata {
    key: string;
    funcName: string;
  }

  export interface RestContext {
    route: string;
    context?: any;
  }
}