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
  constructor(code: ErrorCode.Logic, debugInfo?: any) {
    super(starCode, code, `HQ-${code}.${ErrorCode.Logic[code]}`);
    this.extra.debugInfo = debugInfo;
  }
}

export class FatalError extends AbstractFatalError {
  constructor(code: ErrorCode.FATAL, debugInfo?: any) {
    super(starCode, code, `HQ-${code}.${ErrorCode.FATAL[code]}`);
    this.extra.debugInfo = debugInfo;
  }
}