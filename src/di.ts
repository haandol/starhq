import 'reflect-metadata';

import { Singleton } from './util/singleton';
import * as inversify from 'inversify'

export namespace Di {
  export function inject(target: Object, propertyKey: string | symbol, parameterIndex: number) {
    inversify.inject(target.constructor);
  }

  export function bindClass(target: any) {
    if (container.isBound(target)) return;

    inversify.decorate(inversify.injectable(), target);
    container.bind(target).toSelf().inTransientScope();
  }

  export function bindSingleton(target: (new () => Singleton.SingletonClass)) {
    if (container.isBound(target)) return;

    container.bind(target).toDynamicValue(() => Singleton.SingletonFactory.get(target));
  }

  export function bindConstant(key: any, value: any) {
    if (container.isBound(key)) return;

    container.bind(key).toConstantValue(value);
  }

  export const container: inversify.Container = new inversify.Container();
}