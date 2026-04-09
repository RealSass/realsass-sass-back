import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { AffiliatesModule } from './affiliate/affiliate.module';
import { CollaboratorsModule } from './collaborators/collaborators.module';
import { FirebaseAuthGuard } from './common/guards/firebase-auth.guard';
import { ThemesModule } from './themes/themes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    AffiliatesModule,
    CollaboratorsModule,
    ThemesModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: FirebaseAuthGuard }],
})
export class AppModule {}