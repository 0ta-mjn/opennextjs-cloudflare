import { expect, test } from "@playwright/test";

test.describe("Composable Cache", () => {
	test("cached component should work in ssr", async ({ page }) => {
		await page.goto("/use-cache/ssr");
		let fullyCachedElt = page.getByTestId("fully-cached");
		let isrElt = page.getByTestId("isr");
		await expect(fullyCachedElt).toBeVisible();
		await expect(isrElt).toBeVisible();

		const initialFullyCachedText = await fullyCachedElt.textContent();
		const initialIsrText = await isrElt.textContent();

		let isrText = initialIsrText;

		do {
			await page.reload();
			fullyCachedElt = page.getByTestId("fully-cached");
			isrElt = page.getByTestId("isr");
			await expect(fullyCachedElt).toBeVisible();
			await expect(isrElt).toBeVisible();
			isrText = await isrElt.textContent();
			await page.waitForTimeout(1000);
		} while (isrText === initialIsrText);
		const fullyCachedText = await fullyCachedElt.textContent();
		expect(fullyCachedText).toEqual(initialFullyCachedText);
	});

	test("revalidateTag should work for fullyCached component", async ({ page, request }) => {
		await page.goto("/use-cache/ssr");
		const fullyCachedElt = page.getByTestId("fully-cached-with-tag");
		await expect(fullyCachedElt).toBeVisible();

		const initialFullyCachedText = await fullyCachedElt.textContent();

		const resp = await request.get("/api/revalidate");
		expect(resp.status()).toEqual(200);
		expect(await resp.text()).toEqual("DONE");

		await page.reload();
		await expect(fullyCachedElt).toBeVisible();
		const newFullyCachedText = await fullyCachedElt.textContent();
		expect(newFullyCachedText).not.toEqual(initialFullyCachedText);
	});

	test("cached component should work in isr", async ({ page }) => {
		await page.goto("/use-cache/isr");

		let fullyCachedElt = page.getByTestId("fully-cached");
		let isrElt = page.getByTestId("isr");

		await expect(fullyCachedElt).toBeVisible();
		await expect(isrElt).toBeVisible();

		let initialFullyCachedText = await fullyCachedElt.textContent();
		let initialIsrText = await isrElt.textContent();

		// We have to force reload until ISR has triggered at least once, otherwise the test will be flakey

		let isrText = initialIsrText;

		while (isrText === initialIsrText) {
			await page.reload();
			isrElt = page.getByTestId("isr");
			fullyCachedElt = page.getByTestId("fully-cached");
			await expect(isrElt).toBeVisible();
			isrText = await isrElt.textContent();
			await expect(fullyCachedElt).toBeVisible();
			initialFullyCachedText = await fullyCachedElt.textContent();
			await page.waitForTimeout(1000);
		}
		initialIsrText = isrText;

		do {
			await page.reload();
			fullyCachedElt = page.getByTestId("fully-cached");
			isrElt = page.getByTestId("isr");
			await expect(fullyCachedElt).toBeVisible();
			await expect(isrElt).toBeVisible();
			isrText = await isrElt.textContent();
			await page.waitForTimeout(1000);
		} while (isrText === initialIsrText);
		const fullyCachedText = await fullyCachedElt.textContent();
		expect(fullyCachedText).toEqual(initialFullyCachedText);
	});

	test("cached fetch should work in ISR", async ({ page }) => {
		await page.goto("/use-cache/fetch");

		let dateElt = page.getByTestId("date");
		await expect(dateElt).toBeVisible();

		let initialDate = await dateElt.textContent();

		let isrElt = page.getByTestId("isr");
		await expect(isrElt).toBeVisible();
		let initialIsrText = await isrElt.textContent();

		// We have to force reload until ISR has triggered at least once, otherwise the test will be flakey

		let isrText = initialIsrText;

		while (isrText === initialIsrText) {
			await page.reload();
			isrElt = page.getByTestId("isr");
			dateElt = page.getByTestId("date");
			await expect(isrElt).toBeVisible();
			isrText = await isrElt.textContent();
			await expect(dateElt).toBeVisible();
			initialDate = await dateElt.textContent();
			await page.waitForTimeout(1000);
		}
		initialIsrText = isrText;

		do {
			await page.reload();
			dateElt = page.getByTestId("date");
			isrElt = page.getByTestId("isr");
			await expect(dateElt).toBeVisible();
			await expect(isrElt).toBeVisible();
			isrText = await isrElt.textContent();
			await page.waitForTimeout(1000);
		} while (isrText === initialIsrText);
		const fullyCachedText = await dateElt.textContent();
		expect(fullyCachedText).toEqual(initialDate);
	});
});
