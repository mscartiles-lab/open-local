import { expect, test, type Page } from "@playwright/test";

const languages = [
  {
    code: "en",
    moreTitle: "More",
    resourcesLabel: "Resources",
    languageLabel: "Language",
    maybeLater: "Maybe later",
  },
  {
    code: "es",
    moreTitle: "Más",
    resourcesLabel: "Recursos",
    languageLabel: "Idioma",
    maybeLater: "Quizás después",
  },
  {
    code: "vi",
    moreTitle: "Thêm",
    resourcesLabel: "Tài nguyên",
    languageLabel: "Ngôn ngữ",
    maybeLater: "Để sau",
  },
  {
    code: "pt-BR",
    moreTitle: "Mais",
    resourcesLabel: "Recursos",
    languageLabel: "Idioma",
    maybeLater: "Talvez depois",
  },
  {
    code: "fr",
    moreTitle: "Plus",
    resourcesLabel: "Ressources",
    languageLabel: "Langue",
    maybeLater: "Peut-être plus tard",
  },
] as const;

async function dismissGuestOnboarding(page: Page, maybeLater: string) {
  const skip = page.getByText(maybeLater, { exact: true });
  await expect(skip).toBeVisible();
  await skip.click();
  await expect(skip).toBeHidden();
}

async function openLanguagePicker(page: Page) {
  await page.locator('a[href="/more"]').click();
  await expect(page).toHaveURL(/\/more(?:\?.*)?$/);

  const languageRow = page.getByTestId("more-language");
  await languageRow.scrollIntoViewIfNeeded();
  await languageRow.click();
  await expect(page.getByTestId("language-option-en")).toBeVisible();
}

for (const language of languages) {
  test(`selecting ${language.code} updates More immediately and survives reload`, async ({
    page,
  }) => {
    await page.goto("/");
    await dismissGuestOnboarding(page, "Maybe later");
    await openLanguagePicker(page);

    for (const option of languages) {
      await expect(page.getByTestId(`language-option-${option.code}`)).toBeVisible();
    }

    await page.getByTestId(`language-option-${language.code}`).click();
    await expect(page).toHaveURL(/\/more(?:\?.*)?$/);
    await expect(page.getByText(language.moreTitle, { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText(language.resourcesLabel, { exact: true }).first(),
    ).toBeVisible();

    await page.reload();
    await dismissGuestOnboarding(page, language.maybeLater);
    await expect(page.getByText(language.moreTitle, { exact: true }).first()).toBeVisible();

    await openLanguagePicker(page);
    await expect(page.getByTestId(`selected-language-${language.code}`)).toBeVisible();
    await expect(page.getByTestId("language-picker-title")).toHaveText(
      language.languageLabel,
    );
  });
}