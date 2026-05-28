import { test, expect, type Page } from '@playwright/test'

// ─── Env ──────────────────────────────────────────────────────────────────────

const SEED_EMAIL =
  process.env.PLATFORM_ADMIN_SEED_EMAIL ?? ''

const SEED_PASSWORD =
  process.env.PLATFORM_ADMIN_SEED_PASSWORD ?? ''

// ─── Helper ───────────────────────────────────────────────────────────────────

async function loginAsPlatformAdmin(page: Page): Promise<void> {
  if (!SEED_EMAIL || !SEED_PASSWORD) {
    test.skip(true, 'PLATFORM_ADMIN_SEED_EMAIL / PLATFORM_ADMIN_SEED_PASSWORD not set')
    return
  }

  await page.goto('/platform/login')
  await page.getByLabel('Email', { exact: false }).fill(SEED_EMAIL)
  await page.locator('#platform-password').fill(SEED_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()

  // If MFA challenge appears, skip — smoke tests require a MFA-disabled seed admin.
  const mfaIndicator = page.locator('text=Two-step verification, text=Authenticator App, text=TOTP Code').first()
  const mfaVisible = await mfaIndicator.isVisible({ timeout: 3_000 }).catch(() => false)
  if (mfaVisible) {
    test.skip(true, 'MFA enabled; smoke login requires MFA-disabled seed admin or test helper.')
    return
  }

  await page.waitForURL('**/platform/dashboard', { timeout: 15_000 })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Platform Admin — Smoke Tests', () => {

  // 1. Login page renders
  test('login page renders', async ({ page }) => {
    await page.goto('/platform/login')
    await expect(page.getByLabel('Email', { exact: false })).toBeVisible()
    // Use ID selector to avoid matching the "Show password" aria-label button
    await expect(page.locator('#platform-password')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  // 2. Unauthenticated dashboard redirects to platform login
  test('unauthenticated dashboard redirects to login', async ({ page }) => {
    await page.goto('/platform/dashboard')
    // Middleware redirects unauthenticated /platform/* to /platform/login
    await page.waitForURL(/\/platform\/login/, { timeout: 10_000 })
    expect(page.url()).toContain('/platform/login')
  })

  // 3. Login with valid credentials
  test('login with valid credentials', async ({ page }) => {
    if (!SEED_EMAIL || !SEED_PASSWORD) {
      test.skip(true, 'PLATFORM_ADMIN_SEED_EMAIL / PLATFORM_ADMIN_SEED_PASSWORD not set')
      return
    }

    await loginAsPlatformAdmin(page)

    await expect(
      page.getByRole('heading', { name: /dashboard/i }).or(page.getByText('Dashboard').first()),
    ).toBeVisible({ timeout: 10_000 })
  })

  // 4. Dashboard stat cards visible
  test('dashboard stat cards visible', async ({ page }) => {
    await loginAsPlatformAdmin(page)
    await page.goto('/platform/dashboard')

    // At least 4 stat card labels present
    const statCards = page.locator('[class*="rounded-xl"][class*="border"]')
    await expect(statCards.first()).toBeVisible({ timeout: 10_000 })
    expect(await statCards.count()).toBeGreaterThanOrEqual(4)
  })

  // 5. Tenants list loads
  test('tenants list loads', async ({ page }) => {
    await loginAsPlatformAdmin(page)
    await page.goto('/platform/tenants')

    await expect(
      page.getByRole('heading', { name: /tenants/i }).or(page.getByText('Tenants').first()),
    ).toBeVisible({ timeout: 10_000 })

    // Table rows or empty state should be present
    const tableOrEmpty = page
      .locator('table, [data-empty], text=No tenants found')
      .first()
    await expect(tableOrEmpty).toBeVisible({ timeout: 10_000 })
  })

  // 6. Activity logs loads
  test('activity logs loads', async ({ page }) => {
    await loginAsPlatformAdmin(page)
    await page.goto('/platform/activity-logs')

    await expect(
      page.getByRole('heading', { name: /activity logs/i }).or(page.getByText('Activity Logs').first()),
    ).toBeVisible({ timeout: 10_000 })

    // Table or empty state
    const tableOrEmpty = page
      .locator('table, text=No activity logs yet, text=No logs match')
      .first()
    await expect(tableOrEmpty).toBeVisible({ timeout: 10_000 })
  })

  // 7. Profile page loads
  test('profile page loads', async ({ page }) => {
    await loginAsPlatformAdmin(page)
    await page.goto('/platform/profile')

    await expect(
      page.getByRole('heading', { name: /profile/i }).or(page.getByText('Account Info').first()),
    ).toBeVisible({ timeout: 10_000 })
  })

  // 8. Logout redirects to login
  test('logout redirects to login', async ({ page }) => {
    await loginAsPlatformAdmin(page)

    // Click the sign-out button in the sidebar (aria-label="Sign out")
    await page.getByRole('button', { name: /sign out/i }).click()

    await page.waitForURL(/\/platform\/login/, { timeout: 10_000 })
    expect(page.url()).toContain('/platform/login')
  })

})
