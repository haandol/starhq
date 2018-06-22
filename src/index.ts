import 'source-map-support/register';

export import mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

export { IEvent } from './interface/event';
export { Metadata } from './interface/metadata';
export { Param } from './interface/param';

export { Account } from './interface/account';
export { Auth } from './interface/auth';
export { Player } from './interface/player';
export { Project } from './interface/project';
export { Team } from './interface/team';
export { Invitation } from './interface/invitation';
export { Ticket } from './interface/ticket';
export { Singleton } from './util/singleton';
export { StarError } from './error';
export { Decorator } from './decorator';
export { MongoDust } from './dust/mongo.dust';
export { MessageDust } from './dust/message.dust';
export { Star } from './star';
export { Di } from './di';
export { logger } from './util/logger';