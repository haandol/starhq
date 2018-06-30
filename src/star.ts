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
    if (!CONSUL_TOKEN) throw new FatalError(ErrorCode.FATAL.MISSING_CONSUL_TOKEN, `token.${CONSUL_TOKEN}`);
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
        key: `watch/${MetadataKey.rest}/${this.serviceName}`,
        recurse: true
      });
      await this.consul.kv.del({
        key: `watch/${MetadataKey.rpc}/${this.serviceName}`,
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
    logger.info('[Star] Resister rest endpoints.');
    const consul = this.consul;
    const controllers = this.controllers[MetadataKey.rest];

    for (const controllerClass of this.controllerClasses[MetadataKey.rest]) {
      const endpoints: Metadata.RestMetadata[] = Reflect.getOwnMetadata(
        MetadataKey.rest, controllerClass
      ) || [];
      logger.info(`[Star] Registering rest endpoints to consul.kv: ${endpoints.length}`);

      for (const endpoint of endpoints) {
        const method = endpoint.method;
        const uri = _.replace(endpoint.uri, /\//g, '|');
        const key = `${method}@${uri}`;
        if (!method || !uri) {
          throw new FatalError(ErrorCode.FATAL.NOT_INIT_REST_ENDPOINT, `${key}`);
        }

        controllers[key] = { clazz: controllerClass, funcName: endpoint.funcName }
        await consul.kv.set(
          `watch/${MetadataKey.rest}/${this.serviceName}/${key}`,
          JSON.stringify(endpoint.context)
        );
      }
    }
  }

  private async registerRPCEndpoints(): Promise<void> {
    logger.info('[Star] Resister rpc endpoints.');
    const consul = this.consul;
    const controllers = this.controllers[MetadataKey.rpc];

    for (const controllerClass of this.controllerClasses[MetadataKey.rpc]) {
      const endpoints: Metadata.RpcMetadata[] = Reflect.getOwnMetadata(
        MetadataKey.rpc, controllerClass
      ) || [];
      logger.info(`[Star] Registering rpc endpoints to consul.kv: ${endpoints.length}`);

      for (const endpoint of endpoints) {
        const key = `RPC@${endpoint.funcName}`;
        controllers[key] = { clazz: controllerClass, funcName: endpoint.funcName }
        await consul.kv.set(
          `watch/${MetadataKey.rpc}/${this.serviceName}/${key}`,
          JSON.stringify(endpoint.context)
        );
      }
    }
  }

  private async registerEventEndpoints(): Promise<void> {
    logger.info('[Star] Resister event endpoints.');
    const controllers = this.controllers[MetadataKey.event];

    for (const controllerClass of this.controllerClasses[MetadataKey.event]) {
      const endpoints: Metadata.EventMetadata[] = Reflect.getOwnMetadata(
        MetadataKey.event, controllerClass
      ) || [];
      logger.info(`[Star] Registering event endpoints: ${endpoints.length}`);
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
      await this.messageDust.consumeRest(this.controllers[MetadataKey.rest]);

      await this.registerRPCEndpoints();
      await this.messageDust.consumeRPC(this.controllers[MetadataKey.rpc]);

      await this.registerEventEndpoints();
      await this.messageDust.consumeEvent(this.controllers[MetadataKey.event]);
    } catch(err) {
      logger.error('[Star] Failed to run...\n', err);
      process.exit(1);
    }
  }

  registerRestController(controllerClass: any): void {
    const controllerClasses = this.controllerClasses[MetadataKey.rest];
    controllerClasses.push(controllerClass);
  }

  registerRpcController(controllerClass: any): void {
    const controllerClasses = this.controllerClasses[MetadataKey.rpc];
    controllerClasses.push(controllerClass);
  }

  registerEventController(controllerClass: any): void {
    const controllerClasses = this.controllerClasses[MetadataKey.event];
    controllerClasses.push(controllerClass);
  }
}