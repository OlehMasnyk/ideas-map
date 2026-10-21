CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "demand_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category_id" INTEGER NOT NULL,
    "location" geography(Point,4326) NOT NULL,
    "radius_meters" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "demand_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "demand_requests_radius_check" CHECK ("radius_meters" BETWEEN 100 AND 3000)
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
CREATE INDEX "demand_requests_user_id_category_id_idx" ON "demand_requests"("user_id", "category_id");
CREATE INDEX "demand_requests_location_idx" ON "demand_requests" USING GIST ("location");

ALTER TABLE "demand_requests" ADD CONSTRAINT "demand_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "demand_requests" ADD CONSTRAINT "demand_requests_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
