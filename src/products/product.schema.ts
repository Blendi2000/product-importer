import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { nanoid } from 'nanoid';

@Schema()
export class Variant {
  @Prop()
  itemId: string;

  @Prop()
  packaging: string;

  @Prop()
  price: string; 
}

@Schema()
export class Product extends Document {
  @Prop()
  productId: string;

  @Prop()
  name: string;

  @Prop({ type: [Variant], default: [] }) 
  variants: Variant[]; 

  @Prop({ required: true })
  description: string;

  @Prop()
  vendorId: string;

  @Prop()
  manufacturerId: string;

  @Prop()
  category: string;

  @Prop({ default: () => nanoid() })
  docId: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
