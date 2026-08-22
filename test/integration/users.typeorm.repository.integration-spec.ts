/**
 * Integration test — UsersTypeOrmRepository against a real PostgreSQL instance.
 *
 * Unlike the e2e suite (which drives the app through HTTP), this exercises the
 * repository directly: it proves the TypeORM mapping and SQL round-trip work,
 * independently of controllers, pipes or filters.
 *
 * Requires: docker compose up -d postgres
 */
import { DataSource, Repository } from 'typeorm';
import { UsersTypeOrmRepository } from '../../src/modules/users/domain/repositories/implementations/users.typeorm.repository';
import { UserOrmEntity } from '../../src/modules/users/domain/repositories/implementations/users.typeorm.entity';

describe('UsersTypeOrmRepository (integration — PostgreSQL)', () => {
  let dataSource: DataSource;
  let ormRepository: Repository<UserOrmEntity>;
  let repository: UsersTypeOrmRepository;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.TYPEORM_HOST || 'localhost',
      port: parseInt(process.env.TYPEORM_PORT || '5432', 10),
      username: process.env.TYPEORM_USERNAME || 'qso_user',
      password: process.env.TYPEORM_PASSWORD || 'qso_password',
      database: process.env.TYPEORM_DATABASE || 'qso_example',
      entities: [UserOrmEntity],
      synchronize: true,
    });
    await dataSource.initialize();

    ormRepository = dataSource.getRepository(UserOrmEntity);
    repository = new UsersTypeOrmRepository(ormRepository);
  });

  beforeEach(async () => {
    await ormRepository.query('DELETE FROM "user"');
  });

  afterAll(async () => {
    await ormRepository.query('DELETE FROM "user"');
    await dataSource.destroy();
  });

  describe('create', () => {
    it('persists a user and returns it with a generated id', async () => {
      const user = await repository.create({
        name: 'Integration User',
        email: 'integration@example.com',
      });

      expect(user.id).toBeGreaterThan(0);
      expect(user.name).toBe('Integration User');
      expect(user.email).toBe('integration@example.com');

      const row = await ormRepository.findOneBy({ id: user.id });
      expect(row).not.toBeNull();
      expect(row?.email).toBe('integration@example.com');
    });
  });

  describe('findAll / findById', () => {
    it('returns every row that was persisted', async () => {
      await repository.create({ name: 'User 1', email: 'user1@example.com' });
      await repository.create({ name: 'User 2', email: 'user2@example.com' });

      const users = await repository.findAll();

      expect(users).toHaveLength(2);
    });

    it('returns null for an id that does not exist', async () => {
      const user = await repository.findById(999999);

      expect(user).toBeNull();
    });
  });

  describe('update', () => {
    it('updates the row in the database and returns the new state', async () => {
      const created = await repository.create({
        name: 'Before Update',
        email: 'before@example.com',
      });

      const updated = await repository.update(created.id, {
        name: 'After Update',
      });

      expect(updated).toMatchObject({
        id: created.id,
        name: 'After Update',
        email: 'before@example.com',
      });
    });

    it('returns null when trying to update a row that does not exist', async () => {
      const updated = await repository.update(999999, { name: 'Ghost' });

      expect(updated).toBeNull();
    });
  });

  describe('delete', () => {
    it('removes the row from the database', async () => {
      const created = await repository.create({
        name: 'Delete Me',
        email: 'delete@example.com',
      });

      await repository.delete(created.id);

      const row = await ormRepository.findOneBy({ id: created.id });
      expect(row).toBeNull();
    });

    it('does not throw when deleting a row that does not exist', async () => {
      await expect(repository.delete(999999)).resolves.toBeUndefined();
    });
  });
});
