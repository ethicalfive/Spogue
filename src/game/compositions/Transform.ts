export class Transform {
  public x: number = 0;
  public y: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public facing: number = 0;
  public speed: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  public setVelocityFromAngle(angle: number, speed: number) {
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.facing = angle;
    this.speed = speed;
  }
}
