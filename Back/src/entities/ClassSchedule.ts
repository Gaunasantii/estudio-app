import { Entity, PrimaryKey, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { Subject } from './Subject';
import { DayOfWeek } from '../enums/day-of-week.enum';

@Entity()
export class ClassSchedule {
  @PrimaryKey({ type: 'uuid' })
  id: string = crypto.randomUUID();

  @ManyToOne(() => Subject)
  subject!: Subject;

  @Enum(() => DayOfWeek)
  dayOfWeek!: DayOfWeek;

  @Property({ type: 'time' })
  startTime!: string;

  @Property({ type: 'time' })
  endTime!: string;

  @Property({ nullable: true })
  classroom?: string;
}