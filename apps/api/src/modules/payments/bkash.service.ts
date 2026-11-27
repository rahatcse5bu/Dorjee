import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";

/** What bKash Tokenized Checkout returns; every call answers with statusCode "0000" on success. */
export interface BkashResponse {
  statusCode?: string;
  statusMessage?: string;
  paymentID?: string;
  bkashURL?: string;
  trxID?: string;
  amount?: string;
  transactionStatus?: string;
  merchantInvoiceNumber?: string;
  customerMsisdn?: string;
  paymentExecuteTime?: string;
  // Refund responses.
  refundTrxID?: string;
  originalTrxID?: string;
  completedTime?: string;
  charge?: string;
  // Gateway-level failures (bad token, outage) use these instead.
  errorCode?: string;
  errorMessage?: string;
  message?: string;
}

const PRODUCTION_URL = "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized";
const SANDBOX_URL = "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized";

/**
 * bKash Tokenized Checkout (v1.2.0-beta), the same merchant integration Biye uses.
 * Credentials come from BKASH_USER_NAME, BKASH_PASSWORD, BKASH_APP_KEY and
 * BKASH_APP_SECRET; SANDBOX=ON switches to the sandbox gateway.
 */
@Injectable()
export class BkashService {
  private readonly logger = new Logger(BkashService.name);
  private token: { idToken: string; expiresAt: number } | null = null;

  get enabled() {
    return Boolean(
      process.env.BKASH_USER_NAME && process.env.BKASH_PASSWORD && process.env.BKASH_APP_KEY && process.env.BKASH_APP_SECRET,
    );
  }

  private get baseUrl() {
    if (process.env.BKASH_BASE_URL) return process.env.BKASH_BASE_URL.replace(/\/$/, "");
    return process.env.SANDBOX?.toLowerCase() === "on" ? SANDBOX_URL : PRODUCTION_URL;
  }

  private async post(path: string, headers: Record<string, string>, body: unknown): Promise<BkashResponse> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    return (await response.json()) as BkashResponse;
  }

  /** A grant token lasts an hour; reuse it until a minute before it expires. */
  private async idToken() {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.idToken;
    if (!this.enabled) throw new ServiceUnavailableException("bKash payment is not configured");

    const result = (await this.post(
      "/checkout/token/grant",
      { username: process.env.BKASH_USER_NAME!, password: process.env.BKASH_PASSWORD! },
      { app_key: process.env.BKASH_APP_KEY, app_secret: process.env.BKASH_APP_SECRET },
    )) as BkashResponse & { id_token?: string; expires_in?: number };

    if (!result.id_token) {
      this.logger.error(`bKash token grant failed: ${result.statusMessage ?? result.errorMessage ?? result.message}`);
      throw new ServiceUnavailableException("bKash is not available right now. Please try again.");
    }
    this.token = { idToken: result.id_token, expiresAt: Date.now() + (result.expires_in ?? 3600) * 1000 };
    return this.token.idToken;
  }

  private async authed(path: string, body: unknown) {
    const headers = { authorization: await this.idToken(), "X-App-Key": process.env.BKASH_APP_KEY! };
    const result = await this.post(path, headers, body);
    // An expired or revoked token: get a fresh one and try once more.
    if (result.message && /token|unauthori[sz]ed/i.test(result.message)) {
      this.token = null;
      return this.post(path, { ...headers, authorization: await this.idToken() }, body);
    }
    return result;
  }

  createPayment(input: { amount: number; callbackURL: string; invoice: string; payerReference: string }) {
    return this.authed("/checkout/create", {
      mode: "0011",
      payerReference: input.payerReference,
      callbackURL: input.callbackURL,
      amount: input.amount.toFixed(2),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: input.invoice,
    });
  }

  executePayment(paymentID: string) {
    return this.authed("/checkout/execute", { paymentID });
  }

  queryPayment(paymentID: string) {
    return this.authed("/checkout/payment/status", { paymentID });
  }

  /** Refunds part or all of a completed payment back to the payer's bKash account. */
  refund(input: { paymentID: string; trxID: string; amount: number; reason: string; sku: string }) {
    return this.authed("/checkout/payment/refund", {
      paymentID: input.paymentID,
      trxID: input.trxID,
      amount: input.amount.toFixed(2),
      reason: input.reason.slice(0, 255),
      sku: input.sku.slice(0, 255),
    });
  }

  /** Refund status for a payment: the same endpoint without an amount. */
  refundStatus(paymentID: string, trxID: string) {
    return this.authed("/checkout/payment/refund", { paymentID, trxID });
  }
}
