// Mock de pg para tests en entorno Jest (no hay TextEncoder ni conexiones reales a PostgreSQL)
const mockQuery = jest.fn(() => Promise.resolve({ rows: [], rowCount: 0, fields: [] }));
const mockConnect = jest.fn(() => Promise.resolve({ release: jest.fn(), query: mockQuery }));
const mockPool = jest.fn(() => ({ query: mockQuery, connect: mockConnect, end: jest.fn() }));

jest.mock('pg', () => ({
  Pool: mockPool,
  types: {
    getTypeParser: jest.fn(() => (val) => val),
  },
}));
