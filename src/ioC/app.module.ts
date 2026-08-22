import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import databaseConfig from '../config/database.config';
import { UploadS3Module } from '../common/s3/uploader3.module';
import { CreditModule } from '../modules/credit-engine/credit-engine.module';
import { UsersManagementModule } from '../modules/users-management/users-management.module';
import { UsersModule } from '../modules/users/users.module';
import redisConfig from '../config/redis.config';
import { UserOrmEntity } from '../modules/users/domain/repositories/implementations/users.typeorm.entity';

@Module({
  imports: [
    UploadS3Module,
    CreditModule,
    UsersManagementModule,
    UsersModule,
    ConfigModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule.forRoot({ load: [redisConfig] })],
      useFactory: (configDatabase: ConfigType<typeof redisConfig>) => ({
        redis: {
          port: configDatabase.port,
          host: configDatabase.host,
        },
      }),
      inject: [redisConfig.KEY],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule.forRoot({ load: [databaseConfig] })],
      useFactory: (
        configDatabase: ConfigType<typeof databaseConfig>,
      ): TypeOrmModuleOptions => ({
        type: 'postgres',
        host: configDatabase.host,
        port: configDatabase.port,
        username: configDatabase.username,
        password: configDatabase.password,
        entities: [UserOrmEntity],
        synchronize: true,
        database: configDatabase.database,
      }),
      inject: [databaseConfig.KEY],
    }),
  ],
})
export class AppModule {}
