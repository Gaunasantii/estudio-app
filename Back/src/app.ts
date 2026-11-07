import express from 'express';
import cors from 'cors';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import mikroOrmConfig from '../mikro-orm.config';
import 'reflect-metadata';

export const app = express();
export let orm: MikroORM;

const main = async () => {
  orm = await MikroORM.init(mikroOrmConfig);

  app.use(cors());
  app.use(express.json());

  // Middleware necesario de Mikro-ORM para aislar el Entity Manager por request
  app.use((req, res, next) => {
    RequestContext.create(orm.em, next);
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'EstudioApp API is running' });
  });

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

main().catch((err) => {
  console.error('Error starting server:', err);
});