import { test, expect } from "@playwright/test";

test.describe("bugs/gh-223", () => {
	test("api route", async ({ page }) => {
		const res = await page.request.get("/api/image");
		expect(res.status()).toEqual(200);
		expect((await res.json()).image).toEqual("");
	});
});
