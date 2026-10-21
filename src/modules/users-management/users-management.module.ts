import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from '../../common/loggers/logger.module';
import mongoConfig from '../../config/mongo.config';
import { User, UserSchema } from './domain/user.schema';
import { UsersManagementProcessor } from './queues/users-management.processor';

@Module({
  imports: [
    LoggerModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule.forRoot({ load: [mongoConfig] })],
      useFactory: (config: ConfigType<typeof mongoConfig>) => ({
        uri: config.url,
      }),
      inject: [mongoConfig.KEY],
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [UsersManagementProcessor],
})
export class UsersManagementModule {}
