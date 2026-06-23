import { describe, it, expect, vi } from "vitest";
import { convertPdfToImages } from "../server.js";

// Mock mupdf and sharp to isolate the logic of convertPdfToImages
vi.mock("mupdf", () => {
  return {
    Document: {
      openDocument: vi.fn(() => ({
        needsPassword: () => false,
        countPages: () => 10, // 10 page document
        loadPage: (i) => ({
          toPixmap: () => ({
            asPNG: () => new Uint8Array([1, 2, 3]),
            destroy: () => {}
          })
        }),
        destroy: () => {}
      }))
    },
    ColorSpace: {
      DeviceRGB: "DeviceRGB"
    }
  };
});

vi.mock("sharp", () => {
  return {
    default: vi.fn(() => ({
      grayscale: vi.fn().mockReturnThis(),
      jpeg: vi.fn().mockReturnThis(),
      toBuffer: vi.fn(async () => {
        // Add delay to test concurrency
        await new Promise(resolve => setTimeout(resolve, 50));
        return Buffer.from("fake-jpeg");
      })
    }))
  };
});

describe("convertPdfToImages performance & concurrency", () => {
  it("should process pages in parallel with a concurrency cap of 4", async () => {
    const start = Date.now();
    const progressCalls = [];
    
    const result = await convertPdfToImages(
      Buffer.from("dummy-pdf"),
      "",
      (page, total) => {
        progressCalls.push({ page, total });
      }
    );
    
    const duration = Date.now() - start;
    
    // Result should contain 10 page buffers
    expect(result).toHaveLength(10);
    expect(result[0].toString()).toBe("fake-jpeg");
    
    // Progress callback called 10 times
    expect(progressCalls).toHaveLength(10);
    
    // Concurrency check:
    // With 10 pages, each taking 50ms, and concurrency of 4:
    // Batch 1 (pages 1-4): starts ~0ms, ends ~50ms
    // Batch 2 (pages 5-8): starts ~50ms, ends ~100ms
    // Batch 3 (pages 9-10): starts ~100ms, ends ~150ms
    // Total duration should be around 150ms (well under 500ms which would be sequential)
    expect(duration).toBeLessThan(400);
    expect(duration).toBeGreaterThanOrEqual(100);
  });
});
