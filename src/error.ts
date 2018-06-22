export namespace StarError {

  /*
    1 0 0 1 0 0 0 1
    _____ _ _______
    |     | \_ errorCode
    |     \_ errorLevel
    \_ starCode
  */

  export class AbstractError extends Error {
    public name: string;
    public code: number;
    public reason: string;
    public extra: any;

    constructor(starCode: number, errorLevel: ErrorLevel, errorCode: number, reason: string='') {
      const code = AbstractError.mergeCode(starCode, errorLevel, errorCode);
      super(`${code}-${reason}`);
      this.name = 'AbstractError';
      this.code = code;
      this.reason = reason;
      this.extra = {};
    }

    public static mergeCode(starCode: number, errorLevel: ErrorLevel, errorCode: number) {
      return starCode * 100000 + errorLevel * 10000 + errorCode;
    }

    toCode(errorLevel: ErrorLevel, errorCode: number) {
      return this.code;
    }
  }

  export class AbstractExpectedError extends AbstractError {
    constructor(starCode: number, errorCode: number, reason: string) {
      super(starCode, ErrorLevel.Expected, errorCode, reason);
      this.name = 'ExpectedError';
    }
  }

  export class AbstractLogicError extends AbstractError {
    constructor(starCode: number, errorCode: number, reason: string) {
      super(starCode, ErrorLevel.Logic, errorCode, reason);
      this.name = 'LogicError';
    }
  }

  export class AbstractFatalError extends AbstractError {
    constructor(starCode: number, errorCode: number, reason: string) {
      super(starCode, ErrorLevel.Fatal, errorCode, reason);
      this.name = 'FatalError';
    }
  }

  export enum ErrorLevel {
    Expected = 1,
    Logic = 2,
    Fatal = 3
  }

}