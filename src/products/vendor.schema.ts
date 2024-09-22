import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true }) // This will automatically add createdAt and updatedAt
export class Vendor extends Document {
  @Prop({ unique: true })
  name: string;

  // No need to manually define createdAt and updatedAt if using timestamps
}

export const VendorSchema = SchemaFactory.createForClass(Vendor);
