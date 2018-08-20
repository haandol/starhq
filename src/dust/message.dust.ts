import * as _ from 'lodash';
import * as uuid from 'uuid/v4';
import * as amqp from 'amqplib';
import * as Bluebird from 'bluebird';

import { Di } from '../di';
import { IEvent } from '../interface/event';
import { EXCHANGE, Rpc } from '../interface/constant';
import { Param } from '../interface/param';
import { logger } from '../util/logger';
import { ErrorCode, LogicError, FatalError } from '../util/error';


export class MessageDust {
  protected conn: amqp.Connection;
  protected rpcChannel: amqp.Channel;
  protected eventChannel: amqp.Channel;
  protected responses: any = {};
  protected workerQueue: string;
  protected fanoutQueue: string;
 
  constructor(protected serviceName: string) {
    this.workerQueue = `${this.serviceName}`;
    this.fanoutQueue = `${this.serviceName}.${uuid()}`;
  }

  async initialize(): Promise<void> {
    logger.info('[MessageDust] Initializing...');

    try {
      await this.setupMQ();
    } catch (err) {
      logger.error('[MessageDust] Failed to initialize: ', err);
      process.exit(1);
    }
  }

  private async setupMQ(): Promise<void> {
    const MQ_URL = process.env.MQ_URL || 'rabbitmq';
    const MQ_PORT = process.env.MQ_PORT || '5672';

    this.conn = await amqp.connect(`amqp://star:devenv@${MQ_URL}:${MQ_PORT}`);
    // TODO: support channel pool
    this.rpcChannel = await this.conn.createChannel();
    this.rpcChannel.prefetch(1);

    this.eventChannel = await this.conn.createChannel();
    this.eventChannel.prefetch(1);

    try {
      await this.eventChannel.assertExchange(EXCHANGE, 'topic', {durable: true})
      await this.eventChannel.assertQueue(this.workerQueue, {autoDelete: true});
      await this.eventChannel.assertQueue(this.fanoutQueue, {autoDelete: true});
    } catch (e) {
      await this.eventChannel.deleteQueue(this.workerQueue);
      await this.eventChannel.deleteQueue(this.fanoutQueue);
      throw e
    }
  }

  private async closeQ(): Promise<void> {
    logger.info('[MessageDust] Close channels and connection...');
    await this.eventChannel.close();
    await this.rpcChannel.close();
    await this.conn.close();
  }

  async destroy(): Promise<void> {
    logger.info('[MessageDust] Destroying...');

    try {
      await this.closeQ();
    } catch (err) {
      logger.error('[MessageDust] Failed to destory...\n', err);
    }
  }

  async consumeRest(controllers) {
    for (const rpcName of Object.keys(controllers)) {
      await this.rpcChannel.assertQueue(rpcName, {durable: true});

      this.rpcChannel.consume(rpcName, (msg: amqp.Message) => {
        return Bluebird.try(() => {
          const payload: Request = JSON.parse(msg.content.toString());
          logger.debug(`[MessageDust][REST][${rpcName}][REQ] ${JSON.stringify(payload)} => ${msg.properties.replyTo}`);
          const controllerClass = controllers[rpcName];
          const controller = Di.container.get(controllerClass.clazz);
          return controller[controllerClass.funcName](payload);
        }).then((result) => {
          logger.debug(`[MessageDust][REST][${rpcName}][RES] ${JSON.stringify(result)} => ${msg.properties.replyTo}`);
          this.rpcChannel.sendToQueue(
            msg.properties.replyTo,
            new Buffer(JSON.stringify({success: true, data: result})),
            { correlationId: msg.properties.correlationId, persistent: true }
          );
        }).catch((err) => {
          logger.error(err);
          this.rpcChannel.sendToQueue(
            msg.properties.replyTo,
            new Buffer(JSON.stringify({
              success: false,
              code: err.code,
              message: err.toString()
            })),
            { correlationId: msg.properties.correlationId, persistent: true }
          );
        }).finally(() => {
          this.rpcChannel.ack(msg);
        });
      });
    }
  }

  async consumeRPC(controllers) {
    for (const rpcName of Object.keys(controllers)) {
      await this.rpcChannel.assertQueue(rpcName, {durable: true});

      this.rpcChannel.consume(rpcName, (msg: amqp.Message) => {
        return Bluebird.try(() => {
          const payload: any = JSON.parse(msg.content.toString());
          logger.debug(`[MessageDust][RPC][${rpcName}][REQ] ${JSON.stringify(payload)} => ${msg.properties.replyTo}`);
          const controllerClass = controllers[rpcName];
          const controller = Di.container.get(controllerClass.clazz);
          return controller[controllerClass.funcName](payload);
        }).then((result) => {
          logger.debug(`[MessageDust][RPC][${rpcName}][RES] ${JSON.stringify(result)} => ${msg.properties.replyTo}`);
          this.rpcChannel.sendToQueue(
            msg.properties.replyTo,
            new Buffer(JSON.stringify({success: true, data: result})),
            { correlationId: msg.properties.correlationId, persistent: true }
          );
        }).catch((err) => {
          logger.error(err);
          this.rpcChannel.sendToQueue(
            msg.properties.replyTo,
            new Buffer(JSON.stringify({
              success: false,
              code: err.code,
              message: err.toString()
            })),
            { correlationId: msg.properties.correlationId, persistent: true }
          );
        }).finally(() => {
          this.rpcChannel.ack(msg);
        });
      });
    }
  }

  async consumeGraph(controllers) {
    for (const rpcName of Object.keys(controllers)) {
      await this.rpcChannel.assertQueue(rpcName, {durable: true});

      this.rpcChannel.consume(rpcName, (msg: amqp.Message) => {
        return Bluebird.try(() => {
          const payload: any = JSON.parse(msg.content.toString());
          logger.debug(`[MessageDust][Graph][${rpcName}][REQ] ${JSON.stringify(payload)} => ${msg.properties.replyTo}`);
          const controllerClass = controllers[rpcName];
          const controller = Di.container.get(controllerClass.clazz);
          return controller[controllerClass.funcName](payload);
        }).then((result) => {
          logger.debug(`[MessageDust][Graph][${rpcName}][RES] ${JSON.stringify(result)} => ${msg.properties.replyTo}`);
          this.rpcChannel.sendToQueue(
            msg.properties.replyTo,
            new Buffer(JSON.stringify({success: true, data: result})),
            { correlationId: msg.properties.correlationId, persistent: true }
          );
        }).catch((err) => {
          logger.error(err);
          this.rpcChannel.sendToQueue(
            msg.properties.replyTo,
            new Buffer(JSON.stringify({
              success: false,
              code: err.code,
              message: err.toString()
            })),
            { correlationId: msg.properties.correlationId, persistent: true }
          );
        }).finally(() => {
          this.rpcChannel.ack(msg);
        });
      });
    }
  }

  private getEventKey(cronEvents: string[], key: string): string {
    const keyParts = key.split('.').slice(1);
    for (const cronEvent of cronEvents) {
      const cronParts = cronEvent.split('.').slice(1);
      let isMatched = true;
      for (const parts of _.zip(cronParts, keyParts)) {
        if (parts[0] !== '*' && parts[0] !== parts[1]) {
          isMatched = false;
        }
      }
      if (isMatched) return cronEvent;
    }
    return '';
  }

  async consumeWorkerEvent(controllers) {
    const cronEvents: string[] = [];
    for (const eventName of Object.keys(controllers)) {
      await this.eventChannel.bindQueue(this.workerQueue, EXCHANGE, eventName);
      if (eventName.startsWith('cron.')) cronEvents.push(eventName);
    }

    this.eventChannel.consume(this.workerQueue, (msg: amqp.Message) => {
      return Bluebird.try(() => {
        const payload: any = JSON.parse(msg.content.toString());
        logger.debug(`[MessageDust][Worker Event@${payload.key}][REQ] ${JSON.stringify(payload)}`);

        const eventKey = payload.key.startsWith('cron.') ? this.getEventKey(cronEvents, payload.key) : payload.key;
        if (!eventKey) throw new FatalError(ErrorCode.FATAL.UNREGISTERED_EVENT_KEY);
        const controllerClass = controllers[eventKey];
        const controller = Di.container.get(controllerClass.clazz);
        return controller[controllerClass.funcName](payload);
      }).catch((err) => {
        logger.error(err);
      }).finally(() => {
        this.eventChannel.ack(msg);
      });
    });
  }

  async consumeFanoutEvent(controllers) {
    const cronEvents: string[] = [];
    for (const eventName of Object.keys(controllers)) {
      await this.eventChannel.bindQueue(this.fanoutQueue, EXCHANGE, eventName);
      if (eventName.startsWith('cron.')) cronEvents.push(eventName);
    }

    this.eventChannel.consume(this.fanoutQueue, (msg: amqp.Message) => {
      return Bluebird.try(() => {
        const payload: any = JSON.parse(msg.content.toString());
        logger.debug(`[MessageDust][Fanout Event@${payload.key}][REQ] ${JSON.stringify(payload)}`);

        const eventKey = payload.key.startsWith('cron.') ? this.getEventKey(cronEvents, payload.key) : payload.key;
        if (!eventKey) throw new FatalError(ErrorCode.FATAL.UNREGISTERED_EVENT_KEY);
        const controllerClass = controllers[eventKey];
        const controller = Di.container.get(controllerClass.clazz);
        return controller[controllerClass.funcName](payload);
      }).catch((err) => {
        logger.error(err);
      }).finally(() => {
        this.eventChannel.ack(msg);
      });
    });
  }

  async invokeRPC(rpcParam: Param.RpcParam): Promise<any> {
    logger.debug(`[MessageDust] Invoke RPC with Param: ${JSON.stringify(rpcParam)}`);

    const q = await this.rpcChannel.assertQueue('', {exclusive: true, autoDelete: true});
    const corrId: string = uuid().toString();

    this.rpcChannel.consume(q.queue, (msg: amqp.Message) => {
      if (msg.properties.correlationId === corrId) {
        const waiting = this.responses[corrId];
        if (!waiting) {
          logger.error(`[MessageDust] Got an unknown response: ${corrId}`);
          return;
        }
        delete this.responses[corrId];
        this.rpcChannel.ack(msg);
        return waiting.resolve(msg);
      }
    });

    logger.debug(`[MessageDust][${corrId}][${rpcParam.uri}] send request...`);
    await this.rpcChannel.sendToQueue(
      rpcParam.uri,
      new Buffer(JSON.stringify(rpcParam.payload)),
      { correlationId: corrId, replyTo: q.queue, persistent: true }
    );

    logger.debug(`[MessageDust][${corrId}][${rpcParam.uri}] Watiting for response...`);
    return new Bluebird((resolve, reject) => {
      this.responses[corrId] = { resolve, reject };
    }).then((msg: amqp.Message) => {
      const content = JSON.parse(msg.content.toString());
      logger.debug(`[MessageDust][${corrId}][${rpcParam.uri}][RES] ${JSON.stringify(content)}`);
      return content;
    }).timeout(Rpc.RPC_TIMEOUT).catch((err) => {
      delete this.responses[corrId];
      throw new LogicError(ErrorCode.Logic.RPC_TIMEOUT);
    });
  }

  async publishEvent(event: IEvent<any>) {
    const msg: string = JSON.stringify(event);
    logger.debug(`[MessageDust] Publish event: ${msg}`);
    this.eventChannel.publish(EXCHANGE, event.key, new Buffer(msg));
  }

}
