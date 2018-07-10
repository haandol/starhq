import * as _ from 'lodash';
import { IEvent } from './interface/event';
import { Metadata } from './interface/metadata';

function findEndpoint(endpoints: Array<any>, funcName: string): Metadata.Rest | null {
  return _.find(endpoints, (endpoint) => endpoint.funcName === funcName);
}

export namespace Decorator {

  export namespace Event {
    export function worker(eventClass: { new(...args): IEvent<any> }) {
      return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const endpoints: Metadata.Event[] = Reflect.getOwnMetadata(
          Metadata.Key.WorkerEvent, target.constructor
        ) || [];

        const event = new eventClass()
        const endpoint: Metadata.Event = {
          key: event.key,
          funcName: propertyKey
        };
        endpoints.push(endpoint);
        Reflect.defineMetadata(Metadata.Key.WorkerEvent, endpoints, target.constructor);
      }
    }

    export function fanout(eventClass: { new(...args): IEvent<any> }) {
      return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const endpoints: Metadata.Event[] = Reflect.getOwnMetadata(
          Metadata.Key.FanoutEvent, target.constructor
        ) || [];

        const event = new eventClass()
        const endpoint: Metadata.Event = {
          key: event.key,
          funcName: propertyKey
        };
        endpoints.push(endpoint);
        Reflect.defineMetadata(Metadata.Key.FanoutEvent, endpoints, target.constructor);
      }
    }
  }

  export namespace Endpoint {
    export function rpc(context?: any) {
      return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const endpoints: Metadata.Rpc[] = Reflect.getOwnMetadata(
          Metadata.Key.Rpc, target.constructor
        ) || [];

        const endpoint: Metadata.Rpc = {
          funcName: propertyKey,
          context: context || {}
        };
        endpoints.push(endpoint);
        Reflect.defineMetadata(Metadata.Key.Rpc, endpoints, target.constructor);
      }
    }

    export function rest(route, context?: any) {
      return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const endpoints: Metadata.Rest[] = Reflect.getOwnMetadata(
          Metadata.Key.Rest, target.constructor
        ) || [];

        const [method, uri] = route.split(' ');
        const endpoint = findEndpoint(endpoints, propertyKey);
        if (endpoint) {
          endpoint.method = method;
          endpoint.uri = uri;
        } else {
          const endpoint: Metadata.Rest = {
            method: method,
            uri: uri,
            funcName: propertyKey,
            context: context || {}
          };
          endpoints.push(endpoint);
        }

        Reflect.defineMetadata(Metadata.Key.Rest, endpoints, target.constructor);
      }
    }
  }

  export function requireLevel(level: number) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const endpoints: Metadata.Rest[] = Reflect.getOwnMetadata(
        Metadata.Key.Rest, target.constructor
      ) || [];

      const endpoint = findEndpoint(endpoints, propertyKey);
      if (endpoint) {
        const context: any = endpoint.context || {};
        context.level = level;
        endpoint.context = context;
      } else {
        const endpoint: Metadata.Rest = {
          method: '',
          uri: '',
          funcName: propertyKey,
          context: { level }
        };
        endpoints.push(endpoint);
      }

      Reflect.defineMetadata(Metadata.Key.Rest, endpoints, target.constructor);
    };
  }

}