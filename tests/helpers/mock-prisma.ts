import { vi } from "vitest";

export const mockPrisma = {
  company: {
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn()
  },
  reportPeriod: {
    findMany: vi.fn(),
    findUnique: vi.fn()
  },
  balanceSheetItem: {
    findMany: vi.fn()
  },
  incomeStatementItem: {
    findMany: vi.fn()
  },
  cashflowStatementItem: {
    findMany: vi.fn()
  },
  operatingSegment: {
    findMany: vi.fn()
  }
};

export function resetMockPrisma(): void {
  for (const group of Object.values(mockPrisma)) {
    for (const mockFn of Object.values(group)) {
      mockFn.mockReset();
    }
  }
}
