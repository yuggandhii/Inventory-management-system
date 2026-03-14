import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@ims.local' },
    update: {},
    create: {
      email: 'admin@ims.local',
      password: hash,
      name: 'Admin',
      role: 'admin',
    },
  });
  console.log('User:', user.email);

  const defaultWh = await prisma.warehouse.upsert({
    where: { code: 'MAIN' },
    update: {},
    create: { name: 'Main Warehouse', code: 'MAIN', isDefault: true },
  });
  console.log('Warehouse:', defaultWh.name);

  let cat = await prisma.category.findFirst({ where: { name: 'Raw Materials' } });
  if (!cat) {
    cat = await prisma.category.create({
      data: { name: 'Raw Materials', description: 'Raw materials and components' },
    });
  }
  console.log('Category:', cat.name);

  let product = await prisma.product.findUnique({ where: { sku: 'STEEL-ROD-001' } });
  if (!product) {
    product = await prisma.product.create({
      data: {
        name: 'Steel Rods',
        sku: 'STEEL-ROD-001',
        code: 'SR001',
        categoryId: cat.id,
        unitOfMeasure: 'kg',
        description: 'Steel rods for production',
      },
    });
  }
  await prisma.stockLevel.upsert({
    where: {
      productId_warehouseId: { productId: product.id, warehouseId: defaultWh.id },
    },
    create: { productId: product.id, warehouseId: defaultWh.id, quantity: 100 },
    update: { quantity: 100 },
  });
  console.log('Product:', product.name);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
