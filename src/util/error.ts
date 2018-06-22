import { StarError  } from '../error';

import AbstractFatalError = StarError.AbstractFatalError;

const starCode = 100;

export namespace ErrorCode {
  export enum Logic {
    L0001_RPC_TIMEOUT = 1,
    L0002_PARAM_USER_MISSING = 2,
    L0003_USER_HAS_NO_AUTHORITY = 3,
  }

  export enum FATAL {
    F0001_MISSING_CONSUL_TOKEN = 1,
    F0002_NOT_INIT_REST_ENDPOINT = 2,
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