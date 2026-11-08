export class EnergySystem {
  constructor(max = 100, cost = 20) { this.max = max; this.cost = cost; this.value = max; }
  canSwitch() { return this.value >= this.cost; }
  consume() { if (!this.canSwitch()) return false; this.value -= this.cost; return true; }
  restore(n) { this.value = Math.min(this.max, this.value + n); }
  reset() { this.value = this.max; }
}
