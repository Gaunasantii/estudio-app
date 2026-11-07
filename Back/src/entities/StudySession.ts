import { Entity, PrimaryKey, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { Subject } from './Subject';
import { StudyMethod } from '../enums/study-method.enum';
import { ActivityType } from '../enums/activity-type.enum';

@Entity()
export class StudySession {
  @PrimaryKey({ type: 'uuid' })
  id: string = crypto.randomUUID();

  @ManyToOne(() => Subject)
  subject!: Subject;

  @Enum(() => StudyMethod)
  method!: StudyMethod;

  @Enum(() => ActivityType)
  activityType: ActivityType = ActivityType.PRACTICE;

  @Property()
  startTime!: Date;

  @Property({ nullable: true })
  endTime?: Date;

  @Property({ default: 0 })
  durationSeconds: number = 0;

  @Property({ nullable: true })
  notes?: string;

  @Property({ defaultRaw: `now()` })
  createdAt: Date = new Date();
}