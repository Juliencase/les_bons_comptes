// Champ "Type de mise" — option Rascal "Boulet de canon" (§4.B) : toggle
// éditable pendant la phase de mise (RoundBidsView) et en correction
// (RoundCorrectionView), badge en lecture seule une fois la mise déjà prise
// (RoundTricksView).
import React from 'react';
import Badge from './Badge';
import RoundField from './RoundField';
import SegmentedToggle, { SegmentedOption } from './SegmentedToggle';
import { DEFAULT_BID_KIND } from '../lib/scoring';
import { BID_KINDS, getBidKind } from '../lib/scoreSystems';
import { BidKind } from '../lib/types';

// Construit une seule fois : le catalogue BID_KINDS ne change jamais entre
// deux rendus.
const BID_KIND_OPTIONS: [SegmentedOption<BidKind>, SegmentedOption<BidKind>] =
  [
    { id: BID_KINDS[0].key, name: BID_KINDS[0].name },
    { id: BID_KINDS[1].key, name: BID_KINDS[1].name },
  ];

type Props =
  | { readOnly: true; bidKind: BidKind }
  | { readOnly?: false; bidKind: BidKind; onChange: (kind: BidKind) => void };

export default function BidKindField(props: Props) {
  return (
    <RoundField label="Type de mise">
      {props.readOnly ? (
        // Le catalogue porte le nom en casse titre (« Chevrotine ») ; la
        // majuscule est un choix d'affichage propre à ce badge, appliqué ici
        // plutôt que via un flag dédié sur Badge.
        <Badge label={getBidKind(props.bidKind).name.toUpperCase()} />
      ) : (
        <SegmentedToggle
          options={BID_KIND_OPTIONS}
          selectedId={props.bidKind}
          onSelect={(id) => props.onChange(id ?? DEFAULT_BID_KIND)}
        />
      )}
    </RoundField>
  );
}
