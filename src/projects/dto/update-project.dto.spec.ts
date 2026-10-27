import { invalidFields } from '../../../test/helpers/validate-dto.js';
import { UpdateProjectDto } from './update-project.dto.js';

const validate = (payload: unknown) => invalidFields(UpdateProjectDto, payload);
const repeat = (n: number) => 'a'.repeat(n);

// NOTE: an empty body `{}` must also be rejected, but that rule can live in
// the DTO or in the service. It is asserted at the API level in
// test/projects.e2e-spec.ts.
describe('[Task 3] UpdateProjectDto validation', () => {
  it.each([
    [{ name: 'New name' }],
    [{ description: 'New description' }],
    [{ name: 'N', description: 'D' }],
    [{ name: repeat(100) }],
    [{ description: repeat(500) }],
  ])('accepts %j', async (payload) => {
    expect(await validate(payload)).toEqual([]);
  });

  it.each([
    ['name', { name: '' }],
    ['name', { name: '   ' }],
    ['name', { name: repeat(101) }],
    ['name', { name: 7 }],
    ['name', { name: null }],
    ['description', { description: repeat(501) }],
    ['description', { description: 7 }],
  ])('flags "%s" for %j', async (field, payload) => {
    expect(await validate(payload)).toContain(field);
  });

  it.each(['id', 'createdAt', 'updatedAt', 'tasks', 'unknown'])(
    'rejects the unexpected property "%s"',
    async (key) => {
      expect(await validate({ name: 'P', [key]: 1 })).toContain(key);
    },
  );
});
