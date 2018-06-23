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

```typescript

// app.ts

import { Star, Decorator, Di, Auth, Param, IEvent, logger } from 'starhq';

import ensureUser = Decorator.ensureUser;
import restEndpoint = Decorator.restEndpoint;
import rpcEndpoint = Decorator.rpcEndpoint;
import subscribeEvent = Decorator.subscribeEvent;
import Request = Param.Request;
import inject = Di.inject;

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
  constructor(@inject private service: Service) {
  }

  @restEndpoint('GET /echo')
  async echo(req: Request): Promise<string> {
    return 'pong';
  }
}

// Event example
export class EchoEvent implements IEvent<string> {
  key: string;
  publishedAt: Date;

  constructor(public body: string) {
    this.key = 'hello.world';
    this.publishedAt = new Date();
  }
}

export class EventController {
  @subscribeEvent(EchoEvent)
  async echo(event: EchoEvent): Promise<void> {
    const { key, body } = event;
    logger.info(`Event ${key}: ${body}`);
  }
}

// RPC example
export class RpcController {
  constructor(@inject private service: Service) {
  }

  @rpcEndpoint()
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
    await this.messageDust.publishEvent(new EchoEvent(res));
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