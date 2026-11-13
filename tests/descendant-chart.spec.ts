/// <reference path="./jsdom-global.d.ts" />
import * as jsdomGlobal from 'jsdom-global';

import {JsonDataProvider, JsonGedcomData} from '../src/data';
import {DescendantChart} from '../src/descendant-chart';
import {ExpanderDirection, ExpanderState} from '../src/api';
import {getChildExpanderId} from '../src/expanders';

import {FakeRenderer} from './fake_renderer';

// Initialize DOM.
(jsdomGlobal as any)();  // tslint:disable-line

describe('Descendant chart', () => {
  beforeEach(() => {
    document.body.innerHTML = '<svg></svg>';
  });

  it('should work for a single person', () => {
    const json: JsonGedcomData = {fams: [], indis: [{id: 'I1'}]};
    const data = new JsonDataProvider(json);
    const chart = new DescendantChart({
      data,
      startIndi: 'I1',
      renderer: new FakeRenderer(),
      svgSelector: 'svg',
    });
    chart.render();
    expect(document.querySelectorAll('g.node').length).toEqual(1);
  });

  it('should work with a common descendant of two siblings', () => {
    // I1+I2
    //   F1
    //   |
    //  +-++
    //  |  |
    //  I3+I4
    //    F2
    //    |
    //    I5
    const json: JsonGedcomData = {
      fams: [
        {id: 'F1', husb: 'I1', wife: 'I2', children: ['I3', 'I4']},
        {id: 'F2', husb: 'I3', wife: 'I4', children: ['I5']},
      ],
      indis: [
        {id: 'I1', fams: ['F1']},
        {id: 'I2', fams: ['F1']},
        {id: 'I3', fams: ['F2'], famc: 'F1'},
        {id: 'I4', fams: ['F2'], famc: 'F1'},
        {id: 'I5', famc: 'F2'},
      ],
    };
    const data = new JsonDataProvider(json);
    const chart = new DescendantChart({
      data,
      startFam: 'F1',
      renderer: new FakeRenderer(),
      svgSelector: 'svg',
    });
    chart.render();
  });

  it('should draw the expander buttons again when rendering again', () => {
    // I1+I2
    //   F1
    //   |
    //   I3
    const json: JsonGedcomData = {
      fams: [{id: 'F1', husb: 'I1', wife: 'I2', children: ['I3']}],
      indis: [
        {id: 'I1', fams: ['F1']},
        {id: 'I2', fams: ['F1']},
        {id: 'I3', famc: 'F1'},
      ],
    };
    const collapsedFamily = new Set<string>();
    const render = () =>
      new DescendantChart({
        data: new JsonDataProvider(json),
        startFam: 'F1',
        renderer: new FakeRenderer(),
        svgSelector: 'svg',
        expanders: true,
        collapsedFamily,
      }).render();
    const button = () => document.querySelector('g.familyExpander')!;

    render();
    // [-]
    expect(button().querySelectorAll('rect').length).toEqual(1);
    expect(button().querySelectorAll('line').length).toEqual(1);
    collapsedFamily.add('F1');
    render();
    // [+]
    expect(button().querySelectorAll('rect').length).toEqual(1);
    expect(button().querySelectorAll('line').length).toEqual(2);
    collapsedFamily.clear();
    render();
    // [-] again, without the vertical line of [+].
    expect(button().querySelectorAll('rect').length).toEqual(1);
    expect(button().querySelectorAll('line').length).toEqual(1);
  });

  describe('child expanders', () => {
    // I1+I2
    //   F1
    //   |
    //  +--+--+
    //  |  |  |
    //  I3 I4 I5
    const json: JsonGedcomData = {
      fams: [{id: 'F1', husb: 'I1', wife: 'I2', children: ['I3', 'I4', 'I5']}],
      indis: [
        {id: 'I1', fams: ['F1']},
        {id: 'I2', fams: ['F1']},
        {id: 'I3', famc: 'F1'},
        {id: 'I4', famc: 'F1'},
        {id: 'I5', famc: 'F1'},
      ],
    };

    function createChart(collapsedChild: Set<string>) {
      return new DescendantChart({
        data: new JsonDataProvider(json),
        startFam: 'F1',
        renderer: new FakeRenderer(),
        svgSelector: 'svg',
        expanders: true,
        collapsedChild,
      });
    }

    it('should show a [-] button above each child', () => {
      const root = createChart(new Set()).createHierarchy();
      expect(root.data.family!.expander).toEqual(ExpanderState.MINUS);
      expect(root.data.childExpander).toBeUndefined();
      expect(
        root.children!.map((node) => [node.id, node.data.childExpander]),
      ).toEqual([
        ['I3', ExpanderState.MINUS],
        ['I4', ExpanderState.MINUS],
        ['I5', ExpanderState.MINUS],
      ]);
    });

    it('should not show a button above an only child', () => {
      const chart = new DescendantChart({
        data: new JsonDataProvider({
          fams: [{id: 'F1', husb: 'I1', children: ['I3']}],
          indis: [
            {id: 'I1', fams: ['F1']},
            {id: 'I3', famc: 'F1'},
          ],
        }),
        startFam: 'F1',
        renderer: new FakeRenderer(),
        svgSelector: 'svg',
        expanders: true,
      });
      const root = chart.createHierarchy();
      expect(root.children![0].data.childExpander).toBeUndefined();
      expect(root.data.family!.expander).toEqual(ExpanderState.MINUS);
    });

    it('should hide a single child', () => {
      const root = createChart(
        new Set([getChildExpanderId('F1', 'I4')]),
      ).createHierarchy();
      expect(root.children!.map((node) => node.id)).toEqual(['I3', 'I5']);
      // The family shows [+] to show the hidden child again.
      expect(root.data.family!.expander).toEqual(ExpanderState.PLUS);
    });

    it('should pass the child id to the expander callback', () => {
      const callback = jest.fn();
      const chart = new DescendantChart({
        data: new JsonDataProvider(json),
        startFam: 'F1',
        renderer: new FakeRenderer(),
        svgSelector: 'svg',
        expanders: true,
        expanderCallback: callback,
      });
      chart.render();
      const buttons = document.querySelectorAll('g.childExpander');
      expect(buttons.length).toEqual(3);
      buttons[1].dispatchEvent(new MouseEvent('click'));
      expect(callback).toHaveBeenCalledWith(
        getChildExpanderId('F1', 'I4'),
        ExpanderDirection.CHILD,
      );
    });

  });
});
