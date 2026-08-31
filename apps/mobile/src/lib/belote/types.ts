// Types du domaine Belote classique (4 joueurs, 2 équipes, contrat fixe à 82).

export type BeloteTeam = {
  id: string;
  /** Noms des deux joueurs de l'équipe (affichage : "Alice & Bob"). */
  players: [string, string];
};

/** Saisie d'une manche de Belote. */
export type BeloteHandEntry = {
  /** Équipe qui a annoncé l'atout (le "preneur") — ne sert qu'à juger le contrat. */
  takerTeamId: string;
  /**
   * Points bruts comptés par la 1re équipe (teams[0]), 0..162 (dix de der inclus) ;
   * ceux de la 2e équipe s'en déduisent (HAND_TOTAL_POINTS - teamAPoints). Propriété
   * fixe de l'équipe, indépendante de qui est preneur — évite qu'un changement de
   * preneur ne fasse « changer de camp » un score déjà compté. `null` tant que rien
   * n'a été saisi (manche vierge).
   */
  teamAPoints: number | null;
  /** Équipe ayant remporté toutes les levées (capot), si applicable. */
  capotTeamId: string | null;
  /** Équipe ayant annoncé Belote-Rebelote (Roi+Dame d'atout), si applicable. */
  beloteRebeloteTeamId: string | null;
  validated: boolean;
};

export type BeloteGame = {
  id: string;
  gameKey: 'belote';
  teams: [BeloteTeam, BeloteTeam];
  /** Score cumulé à atteindre pour terminer la partie (500/1000/1500/2000). */
  targetScore: number;
  currentHand: number; // 1..n, pas de borne fixe (fin sur score cible)
  hands: Record<number, BeloteHandEntry>;
  createdAt: number;
  finishedAt?: number;
};
