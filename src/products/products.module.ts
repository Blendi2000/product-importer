import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductService } from './product.service';
import { ProductController } from './product.controller'; // Import the controller
import { Product, ProductSchema } from './product.schema';
import { Vendor, VendorSchema } from './vendor.schema';
import { OpenAIProvider } from './openai.provider'; // Import the provider

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Vendor.name, schema: VendorSchema },
    ]),
  ],
  controllers: [ProductController], // Register the controller here
  providers: [ProductService, OpenAIProvider], // Register it here
  exports: [ProductService],
})
export class ProductsModule {}
