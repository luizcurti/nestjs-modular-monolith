import { Repository } from 'typeorm';
import { User } from '../../models/users.model';
import { UsersRepository } from '../user.repository.interface';
import { UserOrmEntity } from './users.typeorm.entity';

function toDomain(entity: UserOrmEntity): User {
  return { id: entity.id, name: entity.name, email: entity.email };
}

export class UsersTypeOrmRepository implements UsersRepository {
  constructor(private usersRepository: Repository<UserOrmEntity>) {}

  async create(data: Pick<User, 'name' | 'email'>) {
    const saved = await this.usersRepository.save(data);
    return toDomain(saved);
  }

  async findAll() {
    const users = await this.usersRepository.find();
    return users.map(toDomain);
  }

  async findById(id: number) {
    const user = await this.usersRepository.findOneBy({ id });
    return user ? toDomain(user) : null;
  }

  async update(id: number, data: Partial<Pick<User, 'name' | 'email'>>) {
    await this.usersRepository.update(id, data);
    const user = await this.usersRepository.findOneBy({ id });
    return user ? toDomain(user) : null;
  }

  async delete(id: number) {
    await this.usersRepository.delete(id);
  }
}
