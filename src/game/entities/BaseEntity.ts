import { Transform } from '../compositions/Transform';
import { Faction } from '../symmetries/Factions';

export abstract class BaseEntity {
  public id: string;
  public transform: Transform;
  public faction: Faction;
  
  // For serialization to send to clients
  public abstract toJSON(): any;

  constructor(id: string, x: number, y: number, faction: Faction = Faction.NEUTRAL) {
    this.id = id;
    this.transform = new Transform(x, y);
    this.faction = faction;
  }
}
