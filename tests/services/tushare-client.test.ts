import { beforeEach, describe, expect, it, vi } from "vitest";

const { execFileMock } = vi.hoisted(() => ({
  execFileMock: vi.fn()
}));

vi.mock("node:child_process", () => ({
  execFile: execFileMock
}));

import { TushareClient } from "../../src/integrations/tushare/client";

describe("tushare client", () => {
  beforeEach(() => {
    execFileMock.mockReset();
  });

  it("uses python bridge and parses returned rows", async () => {
    execFileMock.mockImplementation(
      (
        _file: string,
        _args: string[],
        _options: unknown,
        callback: (error: Error | null, stdout: string, stderr: string) => void
      ) => callback(null, JSON.stringify({ data: [{ ts_code: "600519.SH", symbol: "600519", name: "贵州茅台" }] }), "")
    );

    const client = new TushareClient({
      token: "test-token",
      pythonBin: "py",
      bridgeScriptPath: "scripts/tushare_bridge.py"
    });

    const result = await client.stockBasicByTsCode("600519.SH");

    expect(execFileMock).toHaveBeenCalledWith(
      "py",
      expect.arrayContaining(["-3", "scripts/tushare_bridge.py", "stock_basic"]),
      expect.objectContaining({
        env: expect.objectContaining({
          TUSHARE_TOKEN: "test-token",
          TUSHARE_HTTP_URL: "http://118.89.66.41:8020/"
        })
      }),
      expect.any(Function)
    );
    expect(result).toEqual({
      ts_code: "600519.SH",
      symbol: "600519",
      name: "贵州茅台"
    });
  });
});
