export namespace Singleton {

  export interface SingletonClass {
    initialize(): void | Promise<void>;
  }

  export interface SingletonContainer {
    [name: string]: SingletonClass;
  }

  export class SingletonFactory {
    static get<T extends SingletonClass>(C: (new () => T)): T {
      const name = (C.prototype.constructor).name;
      let instance = <T>container[name];
      if (!instance) {
        container[name] = instance = new C();
        instance.initialize();
        return instance;
      }
      return instance;
    }
  }

  export const container: SingletonContainer = {};
}