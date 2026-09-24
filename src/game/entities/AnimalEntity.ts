import { LivingEntity } from './LivingEntity';
import { Faction } from '../symmetries/Factions';
import { EntityDatabase, EntityDef } from '../data/EntityData';

export enum AnimalState {
  IDLE = 0,
  WANDER = 1,
  FLEE = 2,
  PURSUE = 3,
  EAT = 4,
  DEAD = 5,
  CIRCLE = 6,
  LUNGE = 7
}

export class AnimalEntity extends LivingEntity {
  public type: string;
  public sex: 'M' | 'F';
  public targetId: string | null = null;
  public wanderTarget?: {x: number, y: number};
  public lungeCooldown: number = 0;
  public circleAngle: number = 0;
  public state: AnimalState = AnimalState.IDLE;
  public stateTimer: number = 0;
  public ownerId: string | null = null; // For tamed dogs
  public kills: number = 0; // for evolution
  public name?: string;
  public level?: number;

  constructor(id: string, x: number, y: number, type: string) {
    const def = EntityDatabase[type] || EntityDatabase['cow'];
    super(id, x, y, def.baseHealth, def.faction);
    this.type = type;
    this.sex = Math.random() > 0.5 ? 'M' : 'F';
    this.circleAngle = Math.random() * Math.PI * 2;
  }

  protected onDeath(): void {
    this.state = AnimalState.DEAD;
    this.transform.vx = 0;
    this.transform.vy = 0;
  }

  public update(dt: number, state: any): void {
    if (this.state === AnimalState.DEAD) return;
    
    this.stateTimer -= dt;
    if (this.lungeCooldown > 0) this.lungeCooldown -= dt;
    this.transform.update(dt);
  }

  public evolveTo(newType: string): void {
      const def = EntityDatabase[newType];
      if (def) {
          this.type = newType;
          this.health.max = def.baseHealth;
          this.health.current = def.baseHealth;
          this.faction = def.faction;
      }
  }

  public toJSON() {
    return {
      id: this.id,
      x: this.transform.x,
      y: this.transform.y,
      type: this.type,
      name: this.name,
      level: this.level,
      state: this.state,
      ownerId: this.ownerId,
      vx: this.transform.vx,
      vy: this.transform.vy,
      health: this.health.current,
      maxHealth: this.health.max,
      sex: this.sex,
      facing: this.transform.facing,
    };
  }
}
