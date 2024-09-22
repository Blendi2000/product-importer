import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductService } from './products/product.service';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot('mongodb://127.0.0.1:27017/product-importer'), // Ensure your MongoDB URI is here
    ProductsModule,
  ],
})
export class AppModule {}
