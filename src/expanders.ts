import { ExpanderDirection } from './api';

/** Collapsed parts of a chart, as used in ChartOptions. */
export interface CollapsedSets {
  collapsedIndi: Set<string>;
  collapsedSpouse: Set<string>;
  collapsedFamily: Set<string>;
  collapsedChild: Set<string>;
}

/**
 * Returns the identifier of a child in a family, as used in collapsedChild
 * and passed to expanderCallback for the CHILD direction.
 *
 * @param familyNodeId id of the node of the parents' family
 * @param childId id of the child individual
 */
export function getChildExpanderId(
  familyNodeId: string,
  childId: string,
): string {
  return JSON.stringify([familyNodeId, childId]);
}

/** Returns the id of the parents' family node of a child expander id. */
function getFamilyNodeId(childExpanderId: string): string | undefined {
  try {
    const parsed = JSON.parse(childExpanderId);
    return Array.isArray(parsed) ? parsed[0] : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Updates the collapsed sets after a click on a [+]/[-] button.
 *
 * A family with hidden children shows a [+] button. Clicking it shows all its
 * children again. Otherwise, the family button hides all its children.
 */
export function toggleExpander(
  sets: CollapsedSets,
  id: string,
  direction: ExpanderDirection,
) {
  if (direction === ExpanderDirection.FAMILY) {
    const hiddenChildren = Array.from(sets.collapsedChild).filter(
      (childId) => getFamilyNodeId(childId) === id,
    );
    if (sets.collapsedFamily.has(id) || hiddenChildren.length) {
      sets.collapsedFamily.delete(id);
      hiddenChildren.forEach((childId) => sets.collapsedChild.delete(childId));
    } else {
      sets.collapsedFamily.add(id);
    }
    return;
  }
  const set =
    direction === ExpanderDirection.INDI
      ? sets.collapsedIndi
      : direction === ExpanderDirection.SPOUSE
        ? sets.collapsedSpouse
        : sets.collapsedChild;
  if (set.has(id)) {
    set.delete(id);
  } else {
    set.add(id);
  }
}
