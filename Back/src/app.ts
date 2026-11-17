import express from 'express';
import cors from 'cors';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import mikroOrmConfig from '../mikro-orm.config';
import 'reflect-metadata';
import authRoutes from './routes/auth.routes';
import subjectRoutes from './routes/subject.routes';
import classScheduleRoutes from './routes/class-schedule.routes';
import studySessionRoutes from './routes/study-session.routes';
import examRoutes from './routes/exam.routes';
import goalRoutes from './routes/goal.routes';

export const app = express();
export let orm: MikroORM;

const main = async () => {
  orm = await MikroORM.init(mikroOrmConfig);
  await orm.getSchemaGenerator().updateSchema();

  app.use(cors());
  app.use(express.json());

  // Middleware necesario de Mikro-ORM para aislar el Entity Manager por request
  app.use((req, res, next) => {
    RequestContext.create(orm.em, next);
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'EstudioApp API is running' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/subjects', subjectRoutes);
  app.use('/api/schedules', classScheduleRoutes);
  app.use('/api/sessions', studySessionRoutes);
  app.use('/api/exams', examRoutes);
  app.use('/api/goals', goalRoutes);

  const PORT = Number(process.env.PORT) || 4000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

main().catch((err) => {
  console.error('Error starting server:', err);
});