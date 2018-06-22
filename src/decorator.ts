import * as _ from 'lodash';
import { IEvent } from './interface/event';
import { Metadata } from './interface/metadata';

import RestMetadata = Metadata.RestMetadata;


export namespace Decorator {

  export function subscribeEvent(eventClass: { new(...args): IEvent<any> }) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const endpoints: Metadata.EventMetadata[] = Reflect.getOwnMetadata(
        Metadata.Key.event, target.constructor
      ) || [];

      const event = new eventClass()
      const endpoint: Metadata.EventMetadata = {
        key: event.key,
        funcName: propertyKey
      };
      endpoints.push(endpoint);
      Reflect.defineMetadata(Metadata.Key.event, endpoints, target.constructor);
    }
  }

  export function rpcEndpoint(context?: any) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const endpoints: Metadata.RpcMetadata[] = Reflect.getOwnMetadata(
        Metadata.Key.rpc, target.constructor
      ) || [];

      const endpoint: Metadata.RpcMetadata = {
        funcName: propertyKey,
        context: context || {}
      };
      endpoints.push(endpoint);
      Reflect.defineMetadata(Metadata.Key.rpc, endpoints, target.constructor);
    }
  }

  export function restEndpoint(route, context?: any) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const endpoints: Metadata.RestMetadata[] = Reflect.getOwnMetadata(
        Metadata.Key.rest, target.constructor
      ) || [];

      const [method, uri] = route.split(' ');
      const endpoint = findEndpoint(endpoints, propertyKey);
      if (endpoint) {
        endpoint.method = method;
        endpoint.uri = uri;
      } else {
        const endpoint: Metadata.RestMetadata = {
          method: method,
          uri: uri,
          funcName: propertyKey,
          context: context || {}
        };
        endpoints.push(endpoint);
      }

      Reflect.defineMetadata(Metadata.Key.rest, endpoints, target.constructor);
    }
  }

  export function ensureUser(requiredLevel: number) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const endpoints: Metadata.RestMetadata[] = Reflect.getOwnMetadata(
        Metadata.Key.rest, target.constructor
      ) || [];

      const endpoint = findEndpoint(endpoints, propertyKey);
      if (endpoint) {
        const context: any = endpoint.context || {};
        context['level'] = requiredLevel;
        endpoint.context = context;
      } else {
        const endpoint: Metadata.RestMetadata = {
          method: '',
          uri: '',
          funcName: propertyKey,
          context: {'level': requiredLevel}
        };
        endpoints.push(endpoint);
      }

      Reflect.defineMetadata(Metadata.Key.rest, endpoints, target.constructor);
    };
  }

  function findEndpoint(endpoints, funcName: string): RestMetadata | null {
      const targets = _.filter(endpoints, (endpoint) => endpoint.funcName === funcName);
      if (!targets) return null;
      return targets[0]
  }

}