import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { Subject } from './Subject';
import { User } from './User';

@Entity()
export class Goal {
  @PrimaryKey({ type: 'uuid' })
  id: string = crypto.randomUUID();

  @ManyToOne(() => User)
  user!: User;

  @ManyToOne(() => Subject, { nullable: true })
  subject?: Subject;

  @Property()
  title!: string;

  @Property({ default: false })
  isCompleted: boolean = false;

  @Property({ nullable: true })
  dueDate?: Date;

  @Property({ defaultRaw: `now()` })
  createdAt: Date = new Date();
}