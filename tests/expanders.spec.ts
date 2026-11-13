import {ExpanderDirection} from '../src/api';
import {
  CollapsedSets,
  getChildExpanderId,
  toggleExpander,
} from '../src/expanders';

function emptySets(): CollapsedSets {
  return {
    collapsedIndi: new Set(),
    collapsedSpouse: new Set(),
    collapsedFamily: new Set(),
    collapsedChild: new Set(),
  };
}

describe('toggleExpander', () => {
  it('should toggle the parents of an individual', () => {
    const sets = emptySets();
    toggleExpander(sets, 'I1', ExpanderDirection.INDI);
    expect(sets.collapsedIndi).toEqual(new Set(['I1']));
    toggleExpander(sets, 'I1', ExpanderDirection.INDI);
    expect(sets.collapsedIndi.size).toEqual(0);
  });

  it('should hide and show a child', () => {
    const sets = emptySets();
    const child = getChildExpanderId('F1', 'I3');
    toggleExpander(sets, child, ExpanderDirection.CHILD);
    expect(sets.collapsedChild).toEqual(new Set([child]));
    toggleExpander(sets, child, ExpanderDirection.CHILD);
    expect(sets.collapsedChild.size).toEqual(0);
  });

  it('should collapse and expand all the children of a family', () => {
    const sets = emptySets();
    toggleExpander(sets, 'F1', ExpanderDirection.FAMILY);
    expect(sets.collapsedFamily).toEqual(new Set(['F1']));
    toggleExpander(sets, 'F1', ExpanderDirection.FAMILY);
    expect(sets.collapsedFamily.size).toEqual(0);
  });

  it('should show the hidden children of a family', () => {
    const sets = emptySets();
    const child1 = getChildExpanderId('F1', 'I3');
    const child2 = getChildExpanderId('F1', 'I4');
    const otherChild = getChildExpanderId('F2', 'I5');
    sets.collapsedChild = new Set([child1, child2, otherChild]);

    toggleExpander(sets, 'F1', ExpanderDirection.FAMILY);

    // The family is expanded instead of being collapsed.
    expect(sets.collapsedFamily.size).toEqual(0);
    expect(sets.collapsedChild).toEqual(new Set([otherChild]));
  });

  it('should show all the children of a collapsed family', () => {
    const sets = emptySets();
    sets.collapsedFamily.add('F1');
    sets.collapsedChild.add(getChildExpanderId('F1', 'I3'));

    toggleExpander(sets, 'F1', ExpanderDirection.FAMILY);

    expect(sets.collapsedFamily.size).toEqual(0);
    expect(sets.collapsedChild.size).toEqual(0);
  });

  it('should not mix up families with similar ids', () => {
    const sets = emptySets();
    const child = getChildExpanderId('F1"', 'I3');
    sets.collapsedChild.add(child);
    toggleExpander(sets, 'F1', ExpanderDirection.FAMILY);
    expect(sets.collapsedChild).toEqual(new Set([child]));
    expect(sets.collapsedFamily).toEqual(new Set(['F1']));
  });
});
