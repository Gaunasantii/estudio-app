import { Entity, PrimaryKey, Property, ManyToOne, OneToMany, Collection } from '@mikro-orm/core';
import { User } from './User';
import { StudySession } from './StudySession';
import { Exam } from './Exam';
import { ClassSchedule } from './ClassSchedule';
import { Goal } from './Goal';

@Entity()
export class Subject {
  @PrimaryKey({ type: 'uuid' })
  id: string = crypto.randomUUID();

  @Property()
  name!: string;

  @Property({ nullable: true })
  color?: string;

  @Property({ default: true })
  isCurrentlyTaking: boolean = true;

  @ManyToOne(() => User)
  user!: User;

  @OneToMany(() => StudySession, (session) => session.subject)
  studySessions = new Collection<StudySession>(this);

  @OneToMany(() => Exam, (exam) => exam.subject)
  exams = new Collection<Exam>(this);

  @OneToMany(() => ClassSchedule, (schedule) => schedule.subject)
  schedules = new Collection<ClassSchedule>(this);

  @OneToMany(() => Goal, (goal) => goal.subject)
  goals = new Collection<Goal>(this);

  @Property({ defaultRaw: `now()` })
  createdAt: Date = new Date();
}