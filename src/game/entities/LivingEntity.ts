import { BaseEntity } from './BaseEntity';
import { Health } from '../compositions/Health';
import { Faction } from '../symmetries/Factions';

export abstract class LivingEntity extends BaseEntity {
  public health: Health;
  public isAlive: boolean = true;

  constructor(id: string, x: number, y: number, maxHealth: number, faction: Faction) {
    super(id, x, y, faction);
    this.health = new Health(maxHealth);
  }

  public takeDamage(amount: number) {
    if (!this.isAlive) return;
    const died = this.health.takeDamage(amount);
    if (died) {
      this.isAlive = false;
      this.onDeath();
    }
  }

  protected abstract onDeath(): void;
  public abstract update(dt: number, state: any): void;
}
