import { InjectQueue } from '@nestjs/bull';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bull';
import { CreateUserDto } from '../http/dtos/create-users.dto';
import { UpdateUserDto } from '../http/dtos/update-users.dto';
import { User } from './models/users.model';
import {
  UsersRepository,
  USERS_REPOSITORY_TOKEN,
} from './repositories/user.repository.interface';
import { UserCreatedEvent } from '../../../common/events/user-created.event';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY_TOKEN)
    private readonly usersRepository: UsersRepository,
    @InjectQueue('users') private usersQueue: Queue,
  ) {}

  async create(userDto: CreateUserDto) {
    const { email, name } = userDto;
    const user = await this.usersRepository.create(userDto);
    await this.usersQueue.add(
      'user.created',
      new UserCreatedEvent(name, email),
    );
    await this.usersQueue.add(
      'user.email.send',
      new UserCreatedEvent(name, email),
    );
    return user;
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.findAll();
  }

  async findById(id: number): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundException(`User with id ${id} not found`);
    return user;
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.usersRepository.update(id, dto);
    if (!user) throw new NotFoundException(`User with id ${id} not found`);
    return user;
  }

  async delete(id: number): Promise<void> {
    await this.findById(id);
    return this.usersRepository.delete(id);
  }
}
