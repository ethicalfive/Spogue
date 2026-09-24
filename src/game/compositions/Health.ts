export class Health {
  public current: number;
  public max: number;

  constructor(max: number) {
    this.max = max;
    this.current = max;
  }

  public takeDamage(amount: number): boolean {
    this.current -= amount;
    if (this.current <= 0) {
      this.current = 0;
      return true; // died
    }
    return false;
  }

  public heal(amount: number) {
    this.current = Math.min(this.max, this.current + amount);
  }

  public isDead(): boolean {
    return this.current <= 0;
  }
}
