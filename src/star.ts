import 'reflect-metadata';
import * as _ from 'lodash';
import * as Consul from 'consul';

import { MongoDust } from './dust/mongo.dust';
import { MessageDust } from './dust/message.dust';
import { Rpc } from './interface/constant';
import { Metadata } from './interface/metadata';
import { Di } from './di';
import { logger } from './util/logger';
import { ErrorCode, FatalError } from './util/error';

import MetadataKey = Metadata.Key;


export class Star {
 protected consul: Consul.Consul;
  protected controllerClasses: any = {};
  protected controllers: any = {};
  protected typeDefs: Array<string> = [];
  protected mongoDust: MongoDust;
  protected messageDust: MessageDust;

  constructor(protected serviceName: string) {
    for (const key of Metadata.Keys) {
      this.controllerClasses[key] = [];
      this.controllers[key] = {};
    }

    this.messageDust = new MessageDust(this.serviceName);
    this.mongoDust = new MongoDust();
  }

  private setupConsul(): void {
    const CONSUL_TOKEN = process.env.CONSUL_TOKEN;
    if (!CONSUL_TOKEN) throw new FatalError(ErrorCode.FATAL.MISSING_CONSUL_TOKEN);
    this.consul = Consul({
      host: process.env.CONSUL_URL || 'consul',
      port: process.env.CONSUL_PORT || '8500',
      defaults: {
        dc: 'dc1',
        token: CONSUL_TOKEN
      },
      promisify: true
    });
  }

  private async initialize(): Promise<void> {
    logger.info('[Star] Initialize app...');

    process.once('SIGTERM', this.destroy.bind(this));
    process.once('SIGINT', this.destroy.bind(this));

    try {
      this.setupConsul();
      await this.messageDust.initialize();
      await this.mongoDust.initialize();
    } catch (err) {
      logger.error('[Star] Failed to initialize: ', err);
      process.exit(1);
    }

    logger.info('[Star] Post-initialize app...');
    try {
      await this.postInitialize();
    } catch (err) {
      logger.error('[Star] Failed to post-initialize: ', err);
      process.exit(1);
    }
  }

  private async destroyConsul(): Promise<void> {
    logger.info('[Star] Destorying star from consul...');
    let kvData: any = await this.consul.kv.get(`${Rpc.STAR_COUNT}/${this.serviceName}`);
    if (!kvData) return;

    kvData = Number(kvData.Value);
    if (kvData < 2) {
      await this.consul.kv.del(`${Rpc.STAR_COUNT}/${this.serviceName}`);
      await this.consul.kv.del({
        key: `watch/${MetadataKey.Rest}/${this.serviceName}`,
        recurse: true
      });
      await this.consul.kv.del({
        key: `watch/${MetadataKey.Rpc}/${this.serviceName}`,
        recurse: true
      });
    } else {
      kvData -= 1;
      await this.consul.kv.set(`${Rpc.STAR_COUNT}/${this.serviceName}`, kvData.toString());
    }
  }

  private async destroy(): Promise<void> {
    logger.info('[Star] Destroying...');

    try {
      await this.destroyConsul();
      await this.messageDust.destroy();
      await this.mongoDust.destroy();
    } catch (err) {
      logger.error('[Star] Failed to destory...\n', err);
    }

    logger.info('[Star] Post-destroying...');
    try {
      await this.postDestroy();
    } catch (err) {
      logger.error('[Star] Failed to post-destory...\n', err);
      process.exit(1);
    }

    process.exit(0);
  }

  private async registerStar(): Promise<void> {
    let kvData: any = await this.consul.kv.get(`${Rpc.STAR_COUNT}/${this.serviceName}`);
    if (!kvData) {
      kvData = 1;
    } else {
      kvData = Number(kvData.Value);
      kvData += 1;
    }
    await this.consul.kv.set(`${Rpc.STAR_COUNT}/${this.serviceName}`, kvData.toString());
  }

  private async registerRestEndpoints(): Promise<void> {
    logger.info('[Star] Register rest endpoints.');
    const consul = this.consul;
    const controllers = this.controllers[MetadataKey.Rest];

    for (const controllerClass of this.controllerClasses[MetadataKey.Rest]) {
      const endpoints: Metadata.Rest[] = Reflect.getOwnMetadata(
        MetadataKey.Rest, controllerClass
      ) || [];
      logger.info(`[Star] Registering rest endpoints to consul.kv: ${endpoints.length}`);

      for (const endpoint of endpoints) {
        const method = endpoint.method;
        const uri = _.replace(endpoint.uri, /\//g, '|');
        const key = `${method}@${uri}`;
        if (!method || !uri) {
          throw new FatalError(ErrorCode.FATAL.NOT_INIT_REST_ENDPOINT);
        }

        controllers[key] = { clazz: controllerClass, funcName: endpoint.funcName }
        await consul.kv.set(
          `watch/${MetadataKey.Rest}/${this.serviceName}/${key}`,
          JSON.stringify(endpoint.context)
        );
      }
    }
  }

  private async registerRPCEndpoints(): Promise<void> {
    logger.info('[Star] Register rpc endpoints.');
    const consul = this.consul;
    const controllers = this.controllers[MetadataKey.Rpc];

    for (const controllerClass of this.controllerClasses[MetadataKey.Rpc]) {
      const endpoints: Metadata.Rpc[] = Reflect.getOwnMetadata(
        MetadataKey.Rpc, controllerClass
      ) || [];
      logger.info(`[Star] Registering rpc endpoints to consul.kv: ${endpoints.length}`);

      for (const endpoint of endpoints) {
        const key = `RPC@${endpoint.funcName}`;
        controllers[key] = { clazz: controllerClass, funcName: endpoint.funcName }
        await consul.kv.set(
          `watch/${MetadataKey.Rpc}/${this.serviceName}/${key}`,
          JSON.stringify(endpoint.context)
        );
      }
    }
  }

  private async registerGraphTypeDefs(): Promise<void> {
    logger.info('[Star] Register graph typedefs.');
    const consul = this.consul;

    const typeDefs = this.typeDefs;
    logger.info(`[Star] Registering graph typedefs to consul.kv: ${typeDefs.length}`);
    await consul.kv.set(
      `graph/${MetadataKey.Graph}/${this.serviceName}/${MetadataKey.TypeDef}`,
      JSON.stringify(typeDefs.join('\n'))
    );
  }

  private async registerGraphResolvers(): Promise<void> {
    logger.info('[Star] Register graph endpoints.');
    const consul = this.consul;
    const controllers = this.controllers[MetadataKey.Graph];

    for (const controllerClass of this.controllerClasses[MetadataKey.Graph]) {
      const endpoints: Metadata.Rpc[] = Reflect.getOwnMetadata(
        MetadataKey.Graph, controllerClass
      ) || [];
      logger.info(`[Star] Registering graph endpoints to consul.kv: ${endpoints.length}`);

      for (const endpoint of endpoints) {
        const key = `Graph@${endpoint.funcName}`;
        controllers[key] = { clazz: controllerClass, funcName: endpoint.funcName }
        await consul.kv.set(
          `graph/${MetadataKey.Graph}/${this.serviceName}/${key}`,
          JSON.stringify(endpoint.context)
        );
      }
    }
  }

  private async registerWorkerEventEndpoints(): Promise<void> {
    logger.info('[Star] Register worker event endpoints.');
    const controllers = this.controllers[MetadataKey.WorkerEvent];

    for (const controllerClass of this.controllerClasses[MetadataKey.WorkerEvent]) {
      const endpoints: Metadata.Event[] = Reflect.getOwnMetadata(
        MetadataKey.WorkerEvent, controllerClass
      ) || [];
      logger.info(`[Star] Registering worker event endpoints: ${endpoints.length}`);
      for (const endpoint of endpoints) {
        const { key, funcName } = endpoint;
        controllers[key] = { clazz: controllerClass, funcName: funcName }
      }
    }
  }

  private async registerFanoutEventEndpoints(): Promise<void> {
    logger.info('[Star] Register fanout event endpoints.');
    const controllers = this.controllers[MetadataKey.FanoutEvent];

    for (const controllerClass of this.controllerClasses[MetadataKey.FanoutEvent]) {
      const endpoints: Metadata.Event[] = Reflect.getOwnMetadata(
        MetadataKey.FanoutEvent, controllerClass
      ) || [];
      logger.info(`[Star] Registering fanout event endpoints: ${endpoints.length}`);
      for (const endpoint of endpoints) {
        const { key, funcName } = endpoint;
        controllers[key] = { clazz: controllerClass, funcName: funcName }
      }
    }
  }

  // For overriding
  async postInitialize() {}
  async postDestroy() {}

  async run(): Promise<void> {
    try {
      await this.initialize();
      Di.bindConstant(this.mongoDust.constructor, this.mongoDust);
      Di.bindConstant(this.messageDust.constructor, this.messageDust);

      await this.registerStar();

      await this.registerRestEndpoints();
      await this.messageDust.consumeRest(this.controllers[MetadataKey.Rest]);

      await this.registerRPCEndpoints();
      await this.messageDust.consumeRPC(this.controllers[MetadataKey.Rpc]);

      await this.registerGraphTypeDefs();
      await this.registerGraphResolvers();
      await this.messageDust.consumeGraph(this.controllers[MetadataKey.Graph]);

      await this.registerWorkerEventEndpoints();
      await this.messageDust.consumeWorkerEvent(this.controllers[MetadataKey.WorkerEvent]);

      await this.registerFanoutEventEndpoints();
      await this.messageDust.consumeFanoutEvent(this.controllers[MetadataKey.FanoutEvent]);
    } catch(err) {
      logger.error('[Star] Failed to run...\n', err);
      process.exit(1);
    }
  }

  registerRestController(controllerClass: any): void {
    const controllerClasses = this.controllerClasses[MetadataKey.Rest];
    if (controllerClasses) controllerClasses.push(controllerClass);
  }

  registerRpcController(controllerClass: any): void {
    const controllerClasses = this.controllerClasses[MetadataKey.Rpc];
    if (controllerClasses) controllerClasses.push(controllerClass);
  }

  registerGraphController(controllerClass: any): void {
    const controllerClasses = this.controllerClasses[MetadataKey.Graph];
    if (controllerClasses) controllerClasses.push(controllerClass);
  }

  registerGraphTypeDef(typeDef: any): void {
    this.typeDefs.push(typeDef);
  }

  registerWorkerEventController(controllerClass: any): void {
    const controllerClasses = this.controllerClasses[MetadataKey.WorkerEvent];
    if (controllerClasses) controllerClasses.push(controllerClass);
  }

  registerFanoutEventController(controllerClass: any): void {
    const controllerClasses = this.controllerClasses[MetadataKey.FanoutEvent];
    if (controllerClasses) controllerClasses.push(controllerClass);
  }
}