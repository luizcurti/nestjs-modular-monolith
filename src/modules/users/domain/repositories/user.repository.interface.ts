import { User } from '../models/users.model';

export interface UsersRepository {
  create(data: Pick<User, 'name' | 'email'>): Promise<User>;
  findAll(): Promise<User[]>;
  findById(id: number): Promise<User | null>;
  update(
    id: number,
    data: Partial<Pick<User, 'name' | 'email'>>,
  ): Promise<User | null>;
  delete(id: number): Promise<void>;
}

export const USERS_REPOSITORY_TOKEN = 'users-repository-token';
