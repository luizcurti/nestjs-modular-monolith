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

const mockQueue = {
  add: jest.fn().mockResolvedValue({}),
  close: jest.fn().mockResolvedValue({}),
};

describe('Application (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [databaseConfig],
          isGlobal: true,
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [UserOrmEntity],
          synchronize: true,
          dropSchema: true,
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

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Users — Full REST CRUD
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Users API — GET /v1/users', () => {
    it('returns empty array when no users exist', () => {
      return request(app.getHttpServer())
        .get('/v1/users')
        .expect(200)
        .expect([]);
    });

    it('returns list with created users', async () => {
      await request(app.getHttpServer())
        .post('/v1/users')
        .send({ name: 'Jane Smith', email: 'jane.smith@example.com' });

      return request(app.getHttpServer())
        .get('/v1/users')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('name');
          expect(res.body[0]).toHaveProperty('email');
        });
    });
  });

  describe('Users API — POST /v1/users', () => {
    it('creates a new user and returns 201 with the resource', () => {
      return request(app.getHttpServer())
        .post('/v1/users')
        .send({ name: 'John Doe', email: 'john.doe@example.com' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('name', 'John Doe');
          expect(res.body).toHaveProperty('email', 'john.doe@example.com');
        });
    });

    it('returns 400 when required fields are missing', () => {
      return request(app.getHttpServer())
        .post('/v1/users')
        .send({})
        .expect(400);
    });

    it('returns 400 for invalid email', () => {
      return request(app.getHttpServer())
        .post('/v1/users')
        .send({ name: 'Bad Email', email: 'not-an-email' })
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

  describe('Users API — GET /v1/users/:id', () => {
    it('returns the user by ID', async () => {
      const create = await request(app.getHttpServer())
        .post('/v1/users')
        .send({ name: 'Find Me', email: 'findme@example.com' });

      const id = create.body.id;

      return request(app.getHttpServer())
        .get(`/v1/users/${id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', id);
          expect(res.body).toHaveProperty('name', 'Find Me');
          expect(res.body).toHaveProperty('email', 'findme@example.com');
        });
    });

    it('returns 404 when user does not exist', () => {
      return request(app.getHttpServer()).get('/v1/users/99999').expect(404);
    });

    it('returns 400 for non-numeric ID', () => {
      return request(app.getHttpServer()).get('/v1/users/abc').expect(400);
    });
  });

  describe('Users API — PATCH /v1/users/:id', () => {
    it('updates the user name', async () => {
      const create = await request(app.getHttpServer())
        .post('/v1/users')
        .send({ name: 'Old Name', email: 'update@example.com' });

      const id = create.body.id;

      return request(app.getHttpServer())
        .patch(`/v1/users/${id}`)
        .send({ name: 'New Name' })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', id);
          expect(res.body).toHaveProperty('name', 'New Name');
          expect(res.body).toHaveProperty('email', 'update@example.com');
        });
    });

    it('updates the user email', async () => {
      const create = await request(app.getHttpServer())
        .post('/v1/users')
        .send({ name: 'Email Update', email: 'old@example.com' });

      const id = create.body.id;

      return request(app.getHttpServer())
        .patch(`/v1/users/${id}`)
        .send({ email: 'new@example.com' })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('email', 'new@example.com');
        });
    });

    it('returns 400 for invalid email on update', async () => {
      const create = await request(app.getHttpServer())
        .post('/v1/users')
        .send({ name: 'Validate Update', email: 'valid@example.com' });

      const id = create.body.id;

      return request(app.getHttpServer())
        .patch(`/v1/users/${id}`)
        .send({ email: 'not-valid' })
        .expect(400);
    });

    it('returns 404 when user does not exist', () => {
      return request(app.getHttpServer())
        .patch('/v1/users/99999')
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

  describe('Users API — DELETE /v1/users/:id', () => {
    it('deletes the user and returns 204', async () => {
      const create = await request(app.getHttpServer())
        .post('/v1/users')
        .send({ name: 'Delete Me', email: 'delete@example.com' });

      const id = create.body.id;

      await request(app.getHttpServer()).delete(`/v1/users/${id}`).expect(204);

      return request(app.getHttpServer()).get(`/v1/users/${id}`).expect(404);
    });

    it('returns 404 when trying to delete non-existent user', () => {
      return request(app.getHttpServer()).delete('/v1/users/99999').expect(404);
    });

    it('returns 400 for non-numeric ID', () => {
      return request(app.getHttpServer()).delete('/v1/users/abc').expect(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Credit Engine
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Credit Engine API — GET /v1/credit', () => {
    it('returns the credit engine message', () => {
      return request(app.getHttpServer())
        .get('/v1/credit')
        .expect(200)
        .expect('Hello Credit Engine');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GraphQL
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GraphQL API', () => {
    it('health check — schema introspection', () => {
      const query = `
        query {
          __schema {
            types {
              name
            }
          }
        }
      `;

      return request(app.getHttpServer())
        .post('/graphql')
        .send({ query })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeDefined();
          expect(res.body.data.__schema).toBeDefined();
        });
    });

    it('mutation create — creates user via GraphQL', () => {
      const mutation = `
        mutation {
          create(data: {
            name: "GraphQL User"
            email: "graphql@example.com"
          }) {
            name
            email
          }
        }
      `;

      return request(app.getHttpServer())
        .post('/graphql')
        .send({ query: mutation })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeDefined();
          expect(res.body.data.create).toHaveProperty('name', 'GraphQL User');
          expect(res.body.data.create).toHaveProperty(
            'email',
            'graphql@example.com',
          );
        });
    });

    it('query findAll — lists users via GraphQL', async () => {
      await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              create(data: { name: "Query User", email: "query@example.com" }) {
                name
                email
              }
            }
          `,
        });

      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              findAll {
                name
                email
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeDefined();
          expect(Array.isArray(res.body.data.findAll)).toBe(true);
          expect(res.body.data.findAll.length).toBeGreaterThan(0);
        });
    });

    it('query findUser — finds user by ID via GraphQL', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/v1/users')
        .send({ name: 'GQL Find', email: 'gqlfind@example.com' });

      const id = createRes.body.id;

      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              findUser(id: ${id}) {
                name
                email
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.errors).toBeUndefined();
          expect(res.body.data.findUser).toHaveProperty('name', 'GQL Find');
          expect(res.body.data.findUser).toHaveProperty(
            'email',
            'gqlfind@example.com',
          );
        });
    });

    it('query findUser — returns null with no GraphQL error for a non-existent ID', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `query { findUser(id: 999999) { name email } }`,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.errors).toBeUndefined();
          expect(res.body.data.findUser).toBeNull();
        });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Error Handling
  // ─────────────────────────────────────────────────────────────────────────────

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

    it('error response includes statusCode, message, timestamp and path', () => {
      return request(app.getHttpServer())
        .get('/v1/users/99999')
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 404);
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('path');
        });
    });
  });
});
