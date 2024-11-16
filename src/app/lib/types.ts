export interface AramStats {
  dmg_dealt: number;
  dmg_taken: number;
  healing: number;
  shielding: number;
  ability_haste: number;
  attack_speed: number;
  energy_regen: number;
}

export interface Champion {
  name: string;
  aram: AramStats;
}

export interface ChampionData {
  [key: string]: Champion;
}
