import { LivingEntity } from './LivingEntity';
import { Faction } from '../symmetries/Factions';
import { ItemData, ItemSlot } from '../Entities';

export class PlayerEntity extends LivingEntity {
  public name: string = "";
  public username: string = "";
  public color: string;
  public score: number = 0;
  public isRidingBoat: boolean = false;
  public packBehavior: string = 'guard';
  public inventory: ItemData[] = [];
  public equipment: Partial<Record<ItemSlot, ItemData>> = {};
  public mana: number = 100;
  public maxMana: number = 100;
  public gameMode?: 'respawn' | 'permadeath';
  public playerClass?: string;
  public baseStats?: { speed: number; attack: number; defense: number; gatherYield: number; maxHealth: number };
  public foodPreservation: number = 0;

  constructor(id: string, color: string) {
    // Start at (0,0) by default, or random later
    super(id, 0, 0, 100, Faction.PLAYER);
    this.color = color;
  }

  protected onDeath(): void {
    // Handled externally, or set state
  }

  public update(dt: number, state: any): void {
    if (this.mana < this.maxMana) {
        this.mana = Math.min(this.maxMana, this.mana + 5 * dt);
    }
  }

  public get TotalDamage() {
    return 25 + (this.equipment[ItemSlot.RIGHT_HAND]?.stats?.damage || 0) + (this.equipment[ItemSlot.LEFT_HAND]?.stats?.damage || 0);
  }

  public get TotalDefense() {
    return (this.equipment[ItemSlot.BODY]?.stats?.defense || 0) + (this.equipment[ItemSlot.HEAD]?.stats?.defense || 0);
  }
  
  // Custom takeDamage to include defense
  public takeDamage(amount: number): void {
    const reducedAmount = Math.max(1, amount - this.TotalDefense);
    super.takeDamage(reducedAmount);
  }

  public toJSON() {
    return {
      id: this.id,
      x: this.transform.x,
      y: this.transform.y,
      color: this.color,
      health: this.health.current,
      mana: this.mana,
      maxMana: this.maxMana,
      isAlive: this.isAlive,
      score: this.score,
      isRidingBoat: this.isRidingBoat,
      packBehavior: this.packBehavior,
      inventory: this.inventory,
      equipment: this.equipment,
      gameMode: this.gameMode,
      playerClass: this.playerClass,
      baseStats: this.baseStats,
      foodPreservation: this.foodPreservation
    };
  }
}
