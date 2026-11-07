import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { Subject } from './Subject';

@Entity()
export class Exam {
  @PrimaryKey({ type: 'uuid' })
  id: string = crypto.randomUUID();

  @ManyToOne(() => Subject)
  subject!: Subject;

  @Property()
  title!: string;

  @Property()
  examDate!: Date;

  @Property({ nullable: true })
  targetHours?: number;

  @Property({ default: false })
  isCompleted: boolean = false;

  @Property({ nullable: true })
  score?: number;

  @Property({ defaultRaw: `now()` })
  createdAt: Date = new Date();
}