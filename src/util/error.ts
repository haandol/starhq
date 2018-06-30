import { StarError  } from '../error';

import AbstractFatalError = StarError.AbstractFatalError;

const starCode = 100;

export namespace ErrorCode {
  export enum Logic {
    RPC_TIMEOUT = 1,
  }

  export enum FATAL {
    MISSING_CONSUL_TOKEN = 1,
    NOT_INIT_REST_ENDPOINT = 2,
  }
}

export class LogicError extends AbstractFatalError {
  constructor(errorCode: ErrorCode.Logic, reason: string) {
    super(starCode, errorCode, reason);
  }
}

export class FatalError extends AbstractFatalError {
  constructor(errorCode: ErrorCode.FATAL, reason: string) {
    super(starCode, errorCode, reason);
  }
}