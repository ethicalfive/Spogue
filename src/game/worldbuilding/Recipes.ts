import { AnimalEntity } from '../entities/AnimalEntity';
import { PlayerEntity } from '../entities/PlayerEntity';

export class WorldRecipes {
  public static spawnPlayer(id: string, color: string): PlayerEntity {
    const p = new PlayerEntity(id, color);
    p.inventory.push({
        id: 'whistle_' + id,
        name: 'Pack Whistle',
        type: 'whistle',
        slot: 'left_hand' as any,
        color: '#fbbf24',
        stats: {}
    });
    return p;
  }

  public static spawnWolf(id: string, x: number, y: number): AnimalEntity {
    return new AnimalEntity(id, x, y, 'wolf');
  }

  public static spawnFox(id: string, x: number, y: number): AnimalEntity {
    return new AnimalEntity(id, x, y, 'fox');
  }

  public static spawnCow(id: string, x: number, y: number): AnimalEntity {
    return new AnimalEntity(id, x, y, 'cow');
  }

  public static spawnShark(id: string, x: number, y: number): AnimalEntity {
    return new AnimalEntity(id, x, y, 'shark');
  }

  public static spawnDolphin(id: string, x: number, y: number): AnimalEntity {
    return new AnimalEntity(id, x, y, 'dolphin');
  }

  public static spawnTuna(id: string, x: number, y: number): AnimalEntity {
    return new AnimalEntity(id, x, y, 'tuna');
  }

  public static spawnDog(id: string, x: number, y: number): AnimalEntity {
    return new AnimalEntity(id, x, y, 'dog');
  }
}
