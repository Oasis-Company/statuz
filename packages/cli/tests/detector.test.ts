import { describe, it, expect } from 'vitest';
import { inferArrows } from '../src/detector/infer.js';
import type { ArrowMap } from '../src/arrow-map/types.js';

describe('Topological Inference Engine', () => {
  describe('inferArrows', () => {
    it('should return empty array for empty map with project node', () => {
      const emptyMap: ArrowMap = {
        arrow_map_version: '0.1.0',
        id: 'test:empty',
        name: 'Empty Map',
        version: '1.0.0',
        status: 'draft',
        nodes: [{ id: 'node-1', type: 'project', name: 'Node 1' }],
        arrows: [],
      };

      const result = inferArrows(emptyMap);
      // Project type nodes are not flagged as orphans
      expect(result.length).toBe(0);
    });

    describe('transitive inference', () => {
      it('should infer transitive dependency A->B->C => A->C', () => {
        const map: ArrowMap = {
          arrow_map_version: '0.1.0',
          id: 'test:transitive',
          name: 'Transitive Test',
          version: '1.0.0',
          status: 'draft',
          nodes: [
            { id: 'A', type: 'component', name: 'A' },
            { id: 'B', type: 'component', name: 'B' },
            { id: 'C', type: 'component', name: 'C' },
          ],
          arrows: [
            { id: 'arrow-1', source: 'A', target: 'B', type: 'dependency' },
            { id: 'arrow-2', source: 'B', target: 'C', type: 'dependency' },
          ],
        };

        const result = inferArrows(map);
        const transitive = result.find(r => r.inference_type === 'transitive');
        
        expect(transitive).toBeDefined();
        expect(transitive?.arrow.source).toBe('A');
        expect(transitive?.arrow.target).toBe('C');
        expect(transitive?.arrow.type).toBe('dependency');
      });

      it('should not infer if arrow already exists', () => {
        const map: ArrowMap = {
          arrow_map_version: '0.1.0',
          id: 'test:existing',
          name: 'Existing Arrow Test',
          version: '1.0.0',
          status: 'draft',
          nodes: [
            { id: 'A', type: 'component', name: 'A' },
            { id: 'B', type: 'component', name: 'B' },
            { id: 'C', type: 'component', name: 'C' },
          ],
          arrows: [
            { id: 'arrow-1', source: 'A', target: 'B', type: 'dependency' },
            { id: 'arrow-2', source: 'B', target: 'C', type: 'dependency' },
            { id: 'arrow-3', source: 'A', target: 'C', type: 'dependency' },
          ],
        };

        const result = inferArrows(map);
        const transitive = result.filter(r => r.inference_type === 'transitive');
        
        expect(transitive.length).toBe(0);
      });
    });

    describe('symmetry inference', () => {
      it('should infer information flow from validation arrow', () => {
        const map: ArrowMap = {
          arrow_map_version: '0.1.0',
          id: 'test:symmetry',
          name: 'Symmetry Test',
          version: '1.0.0',
          status: 'draft',
          nodes: [
            { id: 'validator', type: 'component', name: 'Validator' },
            { id: 'target', type: 'component', name: 'Target' },
          ],
          arrows: [
            { id: 'arrow-1', source: 'validator', target: 'target', type: 'validation' },
          ],
        };

        const result = inferArrows(map);
        const symmetry = result.find(r => r.inference_type === 'symmetry');
        
        expect(symmetry).toBeDefined();
        expect(symmetry?.arrow.source).toBe('target');
        expect(symmetry?.arrow.target).toBe('validator');
        expect(symmetry?.arrow.type).toBe('information_flow');
      });
    });

    describe('completeness inference', () => {
      it('should detect orphaned nodes with no incoming arrows', () => {
        const map: ArrowMap = {
          arrow_map_version: '0.1.0',
          id: 'test:completeness',
          name: 'Completeness Test',
          version: '1.0.0',
          status: 'draft',
          nodes: [
            { id: 'orphan', type: 'component', name: 'Orphan' },
            { id: 'connected', type: 'component', name: 'Connected' },
          ],
          arrows: [
            { id: 'arrow-1', source: 'connected', target: 'orphan', type: 'dependency' },
          ],
        };

        const result = inferArrows(map);
        const completeness = result.filter(r => r.inference_type === 'completeness');
        
        // 'connected' has no incoming arrows
        expect(completeness.some(c => c.arrow.target === 'connected')).toBe(true);
      });

      it('should not flag project type nodes as orphans', () => {
        const map: ArrowMap = {
          arrow_map_version: '0.1.0',
          id: 'test:project',
          name: 'Project Test',
          version: '1.0.0',
          status: 'draft',
          nodes: [
            { id: 'root', type: 'project', name: 'Root Project' },
          ],
          arrows: [],
        };

        const result = inferArrows(map);
        const completeness = result.filter(r => r.inference_type === 'completeness');
        
        expect(completeness.length).toBe(0);
      });
    });
  });
});