import * as uuid from 'uuid/v4';
import * as amqp from 'amqplib';
import * as Bluebird from 'bluebird';

import { Di } from '../di';
import { IEvent } from '../interface/event';
import { EXCHANGE, Rpc } from '../interface/constant';
import { Param } from '../interface/param';
import { logger } from '../util/logger';
import { ErrorCode, LogicError } from '../util/error';


export class MessageDust {
  protected conn: amqp.Connection;
  protected rpcChannel: amqp.Channel;
  protected eventChannel: amqp.Channel;
  protected responses: any = {};
  protected eventQueue: string;
 
  constructor(protected serviceName: string) {
    this.eventQueue = `${this.serviceName}.${uuid()}`;
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

    await this.eventChannel.assertExchange(EXCHANGE, 'topic', {durable: true})
    await this.eventChannel.assertQueue(this.eventQueue, {exclusive: true});
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
          logger.debug(`[MessageDust][${msg.properties.correlationId}][${rpcName}] payload: ${msg.content.toString()} => ${msg.properties.replyTo}`);
          const controllerClass = controllers[rpcName];
          const controller = Di.container.get(controllerClass.clazz);
          return controller[controllerClass.funcName](payload);
        }).then((result) => {
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
          logger.debug(`[MessageDust][${msg.properties.correlationId}][${rpcName}] payload: ${msg.content.toString()} => ${msg.properties.replyTo}`);
          const controllerClass = controllers[rpcName];
          const controller = Di.container.get(controllerClass.clazz);
          return controller[controllerClass.funcName](payload);
        }).then((result) => {
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

  async consumeEvent(controllers) {
    for (const eventName of Object.keys(controllers)) {
      await this.eventChannel.bindQueue(this.eventQueue, EXCHANGE, eventName);

      this.eventChannel.consume(this.eventQueue, (msg: amqp.Message) => {
        return Bluebird.try(() => {
          const payload: any = JSON.parse(msg.content.toString());
          logger.debug(`[MessageDust][Event@${eventName}] payload: ${msg.content.toString()}`);
          const controllerClass = controllers[eventName];
          const controller = Di.container.get(controllerClass.clazz);
          return controller[controllerClass.funcName](payload);
        }).catch((err) => {
          logger.error(err);
        }).finally(() => {
          this.eventChannel.ack(msg);
        });
      });

    }
  }

  async invokeRPC(rpcParam: Param.RpcParam): Promise<any> {
    logger.debug(`[MessageDust] Invoke RPC with Param: ${JSON.stringify(rpcParam)}`);

    const q = await this.rpcChannel.assertQueue('', {exclusive: true});
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
      logger.debug(`[MessageDust][${corrId}][${rpcParam.uri}] Rcvd response: ${msg.content.toString()}`);
      return content;
    }).timeout(Rpc.RPC_TIMEOUT).catch((err) => {
      delete this.responses[corrId];
      throw new LogicError(ErrorCode.Logic.RPC_TIMEOUT, `timedout.${Rpc.RPC_TIMEOUT}`);
    });
  }

  async publishEvent(event: IEvent<any>) {
    const msg: string = JSON.stringify(event);
    logger.debug(`[MessageDust] Publish event: ${msg}`);
    this.eventChannel.publish(EXCHANGE, event.key, new Buffer(msg));
  }

}
