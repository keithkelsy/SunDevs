import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schemas/product.schema';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { MenuRepository } from './repositories/menu.repository';
import { MENU_REPOSITORY } from './interfaces/menu-repository.interface';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
  ],
  controllers: [MenuController],
  providers: [
    MenuService,
    // Bind the abstract token to the concrete Mongoose implementation.
    // To swap to DynamoDB: replace MenuRepository with DynamoMenuRepository here.
    { provide: MENU_REPOSITORY, useClass: MenuRepository },
  ],
  exports: [MenuService],
})
export class MenuModule {}
