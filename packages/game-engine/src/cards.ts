export type OrganType = "brain" | "bones" | "heart" | "stomach" | "wild";

export type CardColor = "blue" | "yellow" | "red" | "green" | "wild";

export type TreatmentType =
  | "transplant"
  | "organ_thief"
  | "contagion"
  | "latex_glove"
  | "medical_error";

export type CardKind = "organ" | "virus" | "medicine" | "treatment";

export type CardDefinition =
  | {
      id: string;
      kind: "organ";
      organType: OrganType;
      color: CardColor;
    }
  | {
      id: string;
      kind: "virus" | "medicine";
      color: CardColor;
    }
  | {
      id: string;
      kind: "treatment";
      treatmentType: TreatmentType;
    };

function makeCopies<T>(count: number, create: (index: number) => T): T[] {
  return Array.from({ length: count }, (_, index) => create(index + 1));
}

const organCopies: Array<{ organType: Exclude<OrganType, "wild">; color: Exclude<CardColor, "wild"> }> = [
  { organType: "brain", color: "blue" },
  { organType: "bones", color: "yellow" },
  { organType: "heart", color: "red" },
  { organType: "stomach", color: "green" },
];

const organs = organCopies.flatMap(({ organType, color }) =>
  makeCopies(5, (copy) => ({
    id: `organ-${organType}-${copy}`,
    kind: "organ" as const,
    organType,
    color,
  })),
);

const wildOrgan: CardDefinition = {
  id: "organ-wild-1",
  kind: "organ",
  organType: "wild",
  color: "wild",
};

const viruses = [
  ...makeCopies(3, (copy) => ({ id: `virus-brain-${copy}`, kind: "virus" as const, color: "blue" as const })),
  ...makeCopies(3, (copy) => ({ id: `virus-bones-${copy}`, kind: "virus" as const, color: "yellow" as const })),
  ...makeCopies(3, (copy) => ({ id: `virus-heart-${copy}`, kind: "virus" as const, color: "red" as const })),
  ...makeCopies(3, (copy) => ({ id: `virus-stomach-${copy}`, kind: "virus" as const, color: "green" as const })),
  { id: "virus-wild-1", kind: "virus" as const, color: "wild" as const },
];

const medicines = [
  ...makeCopies(4, (copy) => ({
    id: `medicine-brain-${copy}`,
    kind: "medicine" as const,
    color: "blue" as const,
  })),
  ...makeCopies(4, (copy) => ({
    id: `medicine-bones-${copy}`,
    kind: "medicine" as const,
    color: "yellow" as const,
  })),
  ...makeCopies(4, (copy) => ({
    id: `medicine-heart-${copy}`,
    kind: "medicine" as const,
    color: "red" as const,
  })),
  ...makeCopies(4, (copy) => ({
    id: `medicine-stomach-${copy}`,
    kind: "medicine" as const,
    color: "green" as const,
  })),
  ...makeCopies(4, (copy) => ({
    id: `medicine-wild-${copy}`,
    kind: "medicine" as const,
    color: "wild" as const,
  })),
];

const treatments = ([
  "transplant",
  "organ_thief",
  "contagion",
  "latex_glove",
  "medical_error",
] as const).flatMap((treatmentType) =>
  makeCopies(2, (copy) => ({
    id: `treatment-${treatmentType}-${copy}`,
    kind: "treatment" as const,
    treatmentType,
  })),
);

export const BASE_DECK: readonly CardDefinition[] = Object.freeze([
  ...organs,
  wildOrgan,
  ...viruses,
  ...medicines,
  ...treatments,
]);

export const BASE_DECK_BY_ID: ReadonlyMap<string, CardDefinition> = new Map(
  BASE_DECK.map((card) => [card.id, card]),
);

export function createBaseDeck(): CardDefinition[] {
  return BASE_DECK.map((card) => ({ ...card }));
}
