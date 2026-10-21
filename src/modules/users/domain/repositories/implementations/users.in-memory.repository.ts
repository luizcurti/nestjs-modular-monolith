import { User } from '../../models/users.model';
import { UsersRepository } from '../user.repository.interface';

export class UsersInMemoryRepository implements UsersRepository {
  private users: User[] = [];
  private nextId = 1;

  async create(data: Pick<User, 'name' | 'email'>) {
    const user: User = Object.assign(new User(), {
      id: this.nextId++,
      ...data,
    });
    this.users.push(user);
    return user;
  }

  async findAll() {
    return this.users;
  }

  async findById(id: number) {
    return this.users.find((u) => u.id === id) ?? null;
  }

  async update(id: number, data: Partial<Pick<User, 'name' | 'email'>>) {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) return null;
    Object.assign(this.users[index], data);
    return this.users[index];
  }

  async delete(id: number) {
    this.users = this.users.filter((u) => u.id !== id);
  }
}
