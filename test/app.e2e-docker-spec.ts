/**
 * E2E — PostgreSQL real (Docker)
 *
 * Requer: docker compose up -d postgres redis
 * Variables read from .env at the project root.
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { UsersController } from '../src/modules/users/http/users.controller';
import { UsersService } from '../src/modules/users/domain/users.service';
import { UserResolver } from '../src/modules/users/http/user.resolver';
import { CreditController } from '../src/modules/credit-engine/http/credit-engine.controller';
import { CreditService } from '../src/modules/credit-engine/domain/credit-engine.service';
import { provideUsersRepository } from '../src/modules/users/domain/repositories/user.repository.provider';
import { LoggerModule } from '../src/common/loggers/logger.module';
import { UserOrmEntity } from '../src/modules/users/domain/repositories/implementations/users.typeorm.entity';
import { AllExceptionsFilter } from '../src/common/filters/exception.filter';
import databaseConfig from '../src/config/database.config';
import { DataSource } from 'typeorm';

const mockQueue = {
  add: jest.fn().mockResolvedValue({}),
  close: jest.fn().mockResolvedValue({}),
};

// ─── helpers ────────────────────────────────────────────────────────────────

async function truncateUsers(app: INestApplication) {
  const ds = app.get(DataSource);
  await ds.query('DELETE FROM "user"');
}

// ─── suite ──────────────────────────────────────────────────────────────────

describe('Application E2E — PostgreSQL Docker', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DATABASE_DATASOURCE = 'typeorm';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [databaseConfig],
          isGlobal: true,
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.TYPEORM_HOST || 'localhost',
          port: parseInt(process.env.TYPEORM_PORT || '5432', 10),
          username: process.env.TYPEORM_USERNAME || 'qso_user',
          password: process.env.TYPEORM_PASSWORD || 'qso_password',
          database: process.env.TYPEORM_DATABASE || 'qso_example',
          entities: [UserOrmEntity],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([UserOrmEntity]),
        GraphQLModule.forRoot<ApolloDriverConfig>({
          driver: ApolloDriver,
          autoSchemaFile: true,
        }),
        LoggerModule,
      ],
      controllers: [UsersController, CreditController],
      providers: [
        UsersService,
        UserResolver,
        CreditService,
        ...provideUsersRepository(),
        {
          provide: 'BullQueue_users',
          useValue: mockQueue,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  beforeEach(async () => {
    await truncateUsers(app);
    mockQueue.add.mockClear();
  });

  afterAll(async () => {
    await truncateUsers(app);
    if (app) await app.close();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /v1/users
  // ─────────────────────────────────────────────────────────────────────────

  describe('GET /v1/users', () => {
    it('returns empty array when no users exist', () => {
      return request(app.getHttpServer())
        .get('/v1/users')
        .expect(200)
        .expect([]);
    });

    it('returns list with created user', async () => {
      await request(app.getHttpServer())
        .post('/v1/users')
        .send({ name: 'List Test', email: 'lista@example.com' });

      const res = await request(app.getHttpServer())
        .get('/v1/users')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0]).toMatchObject({
        name: 'List Test',
        email: 'lista@example.com',
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /v1/users
  // ─────────────────────────────────────────────────────────────────────────

  describe('POST /v1/users', () => {
    it('creates user and returns 201 with database-generated id', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/users')
        .send({ name: 'John Doe', email: 'john.doe@example.com' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(typeof res.body.id).toBe('number');
      expect(res.body.id).toBeGreaterThan(0);
      expect(res.body).toMatchObject({
        name: 'John Doe',
        email: 'john.doe@example.com',
      });
    });

    it('persists in DB — GET returns the created user afterwards', async () => {
      const create = await request(app.getHttpServer())
        .post('/v1/users')
        .send({ name: 'Persist Test', email: 'persist@example.com' })
        .expect(201);

      const id = create.body.id;

      const getRes = await request(app.getHttpServer())
        .get('/v1/users')
        .expect(200);
      const found = getRes.body.find((u: { id: number }) => u.id === id);
      expect(found).toBeDefined();
      expect(found).toMatchObject({
        name: 'Persist Test',
        email: 'persist@example.com',
      });
    });

    it('returns 400 when body is empty', () => {
      return request(app.getHttpServer())
        .post('/v1/users')
        .send({})
        .expect(400);
    });

    it('returns 400 for invalid email', () => {
      return request(app.getHttpServer())
        .post('/v1/users')
        .send({ name: 'Bad Email', email: 'nao-e-email' })
        .expect(400);
    });

    it('returns 400 when name is missing', () => {
      return request(app.getHttpServer())
        .post('/v1/users')
        .send({ email: 'only@email.com' })
        .expect(400);
    });

    it('returns 400 when email is missing', () => {
      return request(app.getHttpServer())
        .post('/v1/users')
        .send({ name: 'Only Name' })
        .expect(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /v1/users/:id
  // ─────────────────────────────────────────────────────────────────────────

  describe('GET /v1/users/:id', () => {
    it('returns the user by ID with all fields', async () => {
      const create = await request(app.getHttpServer())
        .post('/v1/users')
        .send({ name: 'Find Me', email: 'findme@example.com' });

      const id = create.body.id;
      const res = await request(app.getHttpServer())
        .get(`/v1/users/${id}`)
        .expect(200);

      expect(res.body).toMatchObject({
        id,
        name: 'Find Me',
        email: 'findme@example.com',
      });
    });

    it('returns 404 for non-existent ID in DB', () => {
      return request(app.getHttpServer()).get('/v1/users/999999').expect(404);
    });

    it('returns 400 for non-numeric ID', () => {
      return request(app.getHttpServer()).get('/v1/users/abc').expect(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PATCH /v1/users/:id
  // ─────────────────────────────────────────────────────────────────────────

  describe('PATCH /v1/users/:id', () => {
    it('updates the name and persists in DB', async () => {
      const create = await request(app.getHttpServer())
        .post('/v1/users')
        .send({ name: 'Old Name', email: 'update@example.com' });

      const id = create.body.id;

      const update = await request(app.getHttpServer())
        .patch(`/v1/users/${id}`)
        .send({ name: 'New Name' })
        .expect(200);

      expect(update.body).toMatchObject({
        id,
        name: 'New Name',
        email: 'update@example.com',
      });

      // confirms persistence by querying again
      const get = await request(app.getHttpServer())
        .get(`/v1/users/${id}`)
        .expect(200);
      expect(get.body.name).toBe('New Name');
    });

    it('updates the email and persists in DB', async () => {
      const create = await request(app.getHttpServer())
        .post('/v1/users')
        .send({ name: 'Email Upd', email: 'old@example.com' });

      const id = create.body.id;

      const update = await request(app.getHttpServer())
        .patch(`/v1/users/${id}`)
        .send({ email: 'new@example.com' })
        .expect(200);

      expect(update.body).toMatchObject({
        id,
        name: 'Email Upd',
        email: 'new@example.com',
      });

      const get = await request(app.getHttpServer())
        .get(`/v1/users/${id}`)
        .expect(200);
      expect(get.body.email).toBe('new@example.com');
    });

    it('returns 400 for invalid email on update', async () => {
      const create = await request(app.getHttpServer())
        .post('/v1/users')
        .send({ name: 'Valid', email: 'valid@example.com' });

      return request(app.getHttpServer())
        .patch(`/v1/users/${create.body.id}`)
        .send({ email: 'not-valid' })
        .expect(400);
    });

    it('returns 404 when updating non-existent user', () => {
      return request(app.getHttpServer())
        .patch('/v1/users/999999')
        .send({ name: 'Ghost' })
        .expect(404);
    });

    it('returns 400 for non-numeric ID', () => {
      return request(app.getHttpServer())
        .patch('/v1/users/abc')
        .send({ name: 'X' })
        .expect(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE /v1/users/:id
  // ─────────────────────────────────────────────────────────────────────────

  describe('DELETE /v1/users/:id', () => {
    it('deletes the user, returns 204 and confirms removal from DB', async () => {
      const create = await request(app.getHttpServer())
        .post('/v1/users')
        .send({ name: 'Delete Me', email: 'delete@example.com' });

      const id = create.body.id;

      await request(app.getHttpServer()).delete(`/v1/users/${id}`).expect(204);

      // confirms removal from DB
      await request(app.getHttpServer()).get(`/v1/users/${id}`).expect(404);

      // confirms it does not appear in the list
      const list = await request(app.getHttpServer())
        .get('/v1/users')
        .expect(200);
      const found = list.body.find((u: { id: number }) => u.id === id);
      expect(found).toBeUndefined();
    });

    it('returns 404 when deleting non-existent user', () => {
      return request(app.getHttpServer())
        .delete('/v1/users/999999')
        .expect(404);
    });

    it('returns 400 for non-numeric ID', () => {
      return request(app.getHttpServer()).delete('/v1/users/abc').expect(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Credit Engine
  // ─────────────────────────────────────────────────────────────────────────

  describe('GET /v1/credit', () => {
    it('returns the credit engine message', () => {
      return request(app.getHttpServer())
        .get('/v1/credit')
        .expect(200)
        .expect('Hello Credit Engine');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GraphQL
  // ─────────────────────────────────────────────────────────────────────────

  describe('GraphQL', () => {
    it('mutation create — creates user and returns fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              create(data: { name: "GQL User", email: "gql@example.com" }) {
                name
                email
              }
            }
          `,
        })
        .expect(200);

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.create).toMatchObject({
        name: 'GQL User',
        email: 'gql@example.com',
      });
    });

    it('query findAll — returns persisted users', async () => {
      await request(app.getHttpServer())
        .post('/v1/users')
        .send({ name: 'GQL List', email: 'gqlist@example.com' });

      const res = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: `query { findAll { name email } }` })
        .expect(200);

      expect(res.body.errors).toBeUndefined();
      expect(Array.isArray(res.body.data.findAll)).toBe(true);
      expect(res.body.data.findAll.length).toBeGreaterThan(0);
    });

    it('query findUser — finds by ID in real DB', async () => {
      const create = await request(app.getHttpServer())
        .post('/v1/users')
        .send({ name: 'GQL By ID', email: 'gqlbyid@example.com' });

      const id = create.body.id;

      const res = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: `query { findUser(id: ${id}) { name email } }` })
        .expect(200);

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.findUser).toMatchObject({
        name: 'GQL By ID',
        email: 'gqlbyid@example.com',
      });
    });

    it('query findUser — returns null for non-existent ID', async () => {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: `query { findUser(id: 999999) { name email } }` })
        .expect(200);

      // The resolver returns null (nullable field) without a GraphQL error
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.findUser).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Error Handling
  // ─────────────────────────────────────────────────────────────────────────

  describe('Error Handling', () => {
    it('returns 404 for non-existent routes', () => {
      return request(app.getHttpServer()).get('/v1/non-existent').expect(404);
    });

    it('returns 400 for invalid JSON in POST', () => {
      return request(app.getHttpServer())
        .post('/v1/users')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });

    it('error response contains statusCode, message, timestamp and path', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/users/999999')
        .expect(404);
      expect(res.body).toHaveProperty('statusCode', 404);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('path');
    });
  });
});
