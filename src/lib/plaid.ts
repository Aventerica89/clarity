import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "plaid"

const VALID_ENVS = ["sandbox", "development", "production"] as const
type PlaidEnv = typeof VALID_ENVS[number]

function validateEnv(): { clientId: string; secret: string; env: PlaidEnv } {
  const clientId = process.env.PLAID_CLIENT_ID
  const secret = process.env.PLAID_SECRET
  const env = process.env.PLAID_ENV

  if (!clientId || !secret || !env) {
    throw new Error("PLAID_CLIENT_ID, PLAID_SECRET, and PLAID_ENV must be set")
  }

  if (!VALID_ENVS.includes(env as PlaidEnv)) {
    throw new Error(`Invalid PLAID_ENV: "${env}". Must be sandbox, development, or production`)
  }

  return { clientId, secret, env: env as PlaidEnv }
}

export function createPlaidClient(): PlaidApi {
  const { clientId, secret, env } = validateEnv()

  const configuration = new Configuration({
    basePath: PlaidEnvironments[env],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
    },
  })

  return new PlaidApi(configuration)
}

export const PLAID_PRODUCTS: Products[] = [Products.Transactions]
export const PLAID_COUNTRY_CODES: CountryCode[] = [CountryCode.Us]
