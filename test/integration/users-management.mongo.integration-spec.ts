/**
 * Integration test — UsersManagementProcessor against a real MongoDB instance.
 *
 * Exercises the Mongoose schema and the processor's persistence logic directly,
 * without going through Bull or the HTTP layer.
 *
 * Requires: docker compose up -d mongodb_container
 */
import mongoose, { Connection, Model } from 'mongoose';
import { Job } from 'bull';
import { UsersManagementProcessor } from '../../src/modules/users-management/queues/users-management.processor';
import {
  User,
  UserSchema,
} from '../../src/modules/users-management/domain/user.schema';
import { LoggerService } from '../../src/common/loggers/logger.service';
import { UserCreatedEvent } from '../../src/common/events/user-created.event';

describe('UsersManagementProcessor (integration — MongoDB)', () => {
  let connection: Connection;
  let userModel: Model<User>;
  let processor: UsersManagementProcessor;
  let loggerService: LoggerService;

  const mongoUrl =
    process.env.MONGODB_URL ||
    'mongodb://localhost:27017/users_management_integration_test';

  beforeAll(async () => {
    connection = mongoose.createConnection(mongoUrl);
    await connection.asPromise();

    userModel = connection.model(User.name, UserSchema);
    loggerService = new LoggerService();
    loggerService.contextName = UsersManagementProcessor.name;
    processor = new UsersManagementProcessor(loggerService, userModel);
  });

  beforeEach(async () => {
    await userModel.deleteMany({});
  });

  afterAll(async () => {
    await userModel.deleteMany({});
    await connection.close();
  });

  const job = (data: UserCreatedEvent) => ({ data }) as Job<UserCreatedEvent>;

  describe('verify', () => {
    it('persists the event payload as a MongoDB document', async () => {
      await processor.verify(
        job(
          new UserCreatedEvent('Mongo Integration User', 'mongo@example.com'),
        ),
      );

      const docs = await userModel.find().lean();
      expect(docs).toHaveLength(1);
      expect(docs[0]).toMatchObject({
        name: 'Mongo Integration User',
        email: 'mongo@example.com',
      });
    });

    it('creates one independent document per job processed', async () => {
      await processor.verify(
        job(new UserCreatedEvent('User 1', 'user1@example.com')),
      );
      await processor.verify(
        job(new UserCreatedEvent('User 2', 'user2@example.com')),
      );

      const docs = await userModel.find().lean();
      expect(docs).toHaveLength(2);
    });
  });

  describe('sendEmail', () => {
    it('resolves without writing to the database', async () => {
      await expect(
        processor.sendEmail(
          job(new UserCreatedEvent('No Doc User', 'nodoc@example.com')),
        ),
      ).resolves.toBeUndefined();

      const docs = await userModel.find().lean();
      expect(docs).toHaveLength(0);
    });
  });
});
