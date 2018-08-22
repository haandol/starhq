# The StarHQ Web Framework

StarHQ is a DI(dependency injection) included web framework for MSA(micro-service arcihtecture) using RabbitMQ, MongoDB, Redis and Consul.

StarHQ is inspired by [Island](https://github.com/spearhead-ea/island), but made it easier to use.

## Installation

```bash
$ npm i starhq
```

## Service Topology

Client <-> [GatewayStar](https://github.com/haandol/gateway-star) <-> RabbitMQ <-> HelloStar <-> (RabbitMQ, Redis)

## Getting Started

I personally you recommend to use `Controller - Service - Repository` structure to build the app.

- Controller takes the responsibility for the taking and validating parameters.
- Service takes the responsilbilty for all the business logics.
- Repository takes the responsibility for dealing with Storages like MongoDB, Redis, Consul, etc.

### Available Environment Variable

  | Name | Default | Description
  |------|-------|-------|
  | CONSUL_URL | consul | |
  | CONSUL_PORT | "8500" | |
  | CONSUL_TOKEN | 01CE1A0F-F2CB-3BA5-B21F-3048816B5928 | |
  | MQ_URL | rabbitmq | |
  | MQ_PORT | "5672" | |
  | MONGO_URL | mongo | |
  | MONGO_PORT | "27017" | |
  | MONGO_DB | test | |
  | LOG_LEVEL | debug | |

### Example

```typescript

// app.ts

import * as uuid4 from 'uuid/v4'
import { Star, Decorator, Di, Auth, Param, IEvent, logger } from 'starhq';

import rpc = Decorator.Endpoint.rpc;
import rest = Decorator.Endpoint.rest;
import Request = Param.Request;
import inject = Di.inject;
import Auth = IStar.Auth;
import worker = Decorator.Event.worker;
import fanout = Decorator.Event.fanout;

// Your starting point
class EchoStar extends Star {
  async postInitialize() {
    Di.bindClass(EndpointController);
    Di.bindClass(RpcController);
    Di.bindClass(EventController);
    Di.bindClass(Service);
    Di.bindClass(Repository);

    this.registerRestController(EndpointController);
    this.registerRpcController(RpcController);
    this.registerEventController(EventController);
  }
}

new EchoStar('echo').run();

// Endpoint example
export class EndpointController {
  @rest('GET /echo')
  async echo(req: Request): Promise<string> {
    return 'pong';
  }

  @rest('GET /echo/:id')
  async echoUserLevel(req: Request): Promise<string> {
    const { id } = req.params;
    return `user id: ${id}`;
  }
}

// Event example
export class EchoEvent implements IEvent<string> {
  key: string;
  publishedAt: Date;

  constructor(public root: string, public body: string) {
    this.key = 'user.echo';
    this.publishedAt = new Date();
  }
}

export class EventController {
  @worker(EchoEvent)
  async onWorker(event: EchoEvent): Promise<void> {
    const { root, key, body } = event;
    logger.info(`Round Robin Event ${key} : ${root} => ${body}`);
  }

  @fanout('user.echo')  // use key name directly
  async onFanout(event: EchoEvent): Promise<void> {
    const { root, key, body } = event;
    logger.info(`Fanout Event ${key} => ${root} => ${body}`);
  }

}

// RPC example
export class RpcController {
  constructor(@inject private service: Service) {
  }

  @rpc()
  async echo(param): Promise<string> {
    return this.service.echo(param.text);
  }
}

// Service
class Service {
  constructor(@inject private messageDust: MessageDust,
              @inject private repository: Repository) {
  }

  async echo(text: string): Promise<string> {
    const res = await this.repository.echo(text);
    await this.messageDust.publishEvent(new EchoEvent(uuid4().toString(), res));
    return res;
  }
}

// Repository
class Repository {
  async echo(text: string): Promise<string> {
    return text;
  }
}
```

and run the server

```bash
$ tsc
$ node app.js
```