class MapGen {
  seed: string;
  constructor(seed: string = 'default_seed') {
    this.seed = seed;
  }
}
console.log(new MapGen(undefined).seed);
