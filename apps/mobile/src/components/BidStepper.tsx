// Champ "Sa mise" des vues de saisie de manche Skull King : éditable pendant
// la phase de mise (RoundBidsView) et en correction (RoundCorrectionView), en
// lecture seule pendant la phase plis/bonus une fois la mise déjà prise
// (RoundTricksView) — même habillage `RoundField`/`Stepper` dans les 2 cas.
import React from 'react';
import RoundField from './RoundField';
import Stepper from './Stepper';
import { colors } from '../theme';

type Props =
  | { readOnly: true; value: number | null; cards: number }
  | {
      readOnly?: false;
      value: number | null;
      cards: number;
      onChange: (value: number) => void;
    };

export default function BidStepper(props: Props) {
  const { value, cards } = props;
  return (
    <RoundField label="Sa mise" max={props.readOnly ? undefined : cards}>
      <Stepper
        readOnly={props.readOnly}
        value={value}
        min={0}
        max={cards}
        onChange={props.readOnly ? undefined : props.onChange}
        accent={colors.sanguine}
        decrementLabel="Diminuer la mise"
        incrementLabel="Augmenter la mise"
      />
    </RoundField>
  );
}
