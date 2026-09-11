import { boolean, index, integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const marketplaceListings = pgTable("marketplace_listings", {
  id: serial("id").primaryKey(), title: text("title").notNull(), description: text("description").notNull(), price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  userId: text("user_id").notNull(), userName: text("user_name").notNull(), userRole: text("user_role").notNull(), userPhone: text("user_phone").notNull().default(""),
  category: text("category").notNull(), location: text("location").notNull().default(""), isApproved: boolean("is_approved").notNull().default(false),
  partsGrade: text("parts_grade").notNull().default(""), application: text("application").notNull().default(""), partBrand: text("part_brand").notNull().default(""), partNumber: text("part_number"),
  imageUris: text("image_uris").array().notNull().default([]), isFeaturedBottom: boolean("is_featured_bottom").notNull().default(false),
  carMake: text("car_make"), carModel: text("car_model"), carYear: integer("car_year"), carTrim: text("car_trim"), carBodyType: text("car_body_type"), carExteriorColor: text("car_exterior_color"), carInteriorColor: text("car_interior_color"), carEngineType: text("car_engine_type"), carTransmission: text("car_transmission"), carFuelType: text("car_fuel_type"), carMileage: integer("car_mileage"), carDriveType: text("car_drive_type"), carCondition: text("car_condition"), carAccidentHistory: text("car_accident_history"), carServiceHistory: text("car_service_history"), carPreviousOwners: integer("car_previous_owners"), carRegistrationStatus: text("car_registration_status"), carCustomsPapers: text("car_customs_papers"), carVin: text("car_vin"), carPlateNumber: text("car_plate_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("listings_owner_created_idx").on(table.userId, table.createdAt), index("listings_public_created_idx").on(table.isApproved, table.createdAt)]);
export const insertMarketplaceListingSchema = createInsertSchema(marketplaceListings).omit({ id: true, createdAt: true, updatedAt: true, isApproved: true, isFeaturedBottom: true });
export type InsertMarketplaceListing = z.infer<typeof insertMarketplaceListingSchema>;
export type MarketplaceListing = typeof marketplaceListings.$inferSelect;