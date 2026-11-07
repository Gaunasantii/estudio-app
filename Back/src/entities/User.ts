import { Entity, PrimaryKey, Property, Collection, OneToMany } from '@mikro-orm/core';
import { Subject } from './Subject';
import { Goal } from './Goal';

@Entity()
export class User {
  @PrimaryKey({ type: 'uuid' })
  id: string = crypto.randomUUID();

  @Property({ unique: true })
  email!: string;

  @Property({ hidden: true })
  password!: string;

  @Property()
  name!: string;

  @OneToMany(() => Subject, (subject) => subject.user)
  subjects = new Collection<Subject>(this);

  @OneToMany(() => Goal, (goal) => goal.user)
  goals = new Collection<Goal>(this);

  @Property({ defaultRaw: `now()` })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), defaultRaw: `now()` })
  updatedAt: Date = new Date();
}