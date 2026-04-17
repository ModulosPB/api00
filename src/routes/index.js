import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    name: 'api00',
    version: '0.1.0',
    endpoints: ['/health'],
  });
});

export default router;
