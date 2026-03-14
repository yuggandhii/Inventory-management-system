import { Router } from 'express';
import { body, query } from 'express-validator';
import { prisma } from '../../lib/prisma.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

router.get(
  '/',
  [query('parentId').optional().isString()],
  validate,
  async (req, res, next) => {
    try {
      const { parentId } = req.query;
      const where = parentId === 'null' || parentId === '' ? { parentId: null } : { parentId: parentId || undefined };
      const list = await prisma.category.findMany({
        where,
        include: { _count: { select: { products: true } } },
        orderBy: { name: 'asc' },
      });
      res.json(list);
    } catch (err) {
      next(err);
    }
  }
);

router.get('/tree', async (req, res, next) => {
  try {
    const all = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
    const byId = {};
    all.forEach((c) => { byId[c.id] = { ...c, children: [] }; });
    const roots = [];
    all.forEach((c) => {
      const node = byId[c.id];
      if (!c.parentId) roots.push(node);
      else if (byId[c.parentId]) byId[c.parentId].children.push(node);
      else roots.push(node);
    });
    res.json(roots);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const cat = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: { parent: true, _count: { select: { products: true } } },
    });
    if (!cat) return res.status(404).json({ success: false, error: 'Category not found' });
    res.json(cat);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  [
    body('name').trim().notEmpty(),
    body('description').optional().trim(),
    body('parentId').optional().isString(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, description, parentId } = req.body;
      const category = await prisma.category.create({
        data: { name, description: description || null, parentId: parentId || null },
      });
      res.status(201).json(category);
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('parentId').optional().isString(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, description, parentId } = req.body;
      const category = await prisma.category.update({
        where: { id: req.params.id },
        data: { ...(name && { name }), ...(description !== undefined && { description }), ...(parentId !== undefined && { parentId: parentId || null }) },
      });
      res.json(category);
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Category not found' });
      next(err);
    }
  }
);

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Category not found' });
    if (err.code === 'P2003') return res.status(400).json({ success: false, error: 'Category has products or children' });
    next(err);
  }
});

export const categoryRoutes = router;
