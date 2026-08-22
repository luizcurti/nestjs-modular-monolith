import { NotFoundException } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CreateUserDto, UserOutput } from './dtos/create-users.dto';
import { UsersService } from '../domain/users.service';

@Resolver('User')
export class UserResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => [UserOutput])
  findAll(): Promise<UserOutput[]> {
    return this.usersService.findAll();
  }

  @Query(() => UserOutput, { nullable: true })
  async findUser(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<UserOutput | null> {
    try {
      return await this.usersService.findById(id);
    } catch (error) {
      if (error instanceof NotFoundException) return null;
      throw error;
    }
  }

  @Mutation(() => UserOutput)
  create(@Args('data') args: CreateUserDto): Promise<UserOutput> {
    return this.usersService.create(args);
  }
}
