declare module 'node-saml' {
  export interface SamlOptions {
    entryPoint: string
    issuer: string
    cert: string
    callbackUrl?: string
    [key: string]: unknown
  }

  export interface SamlProfile {
    nameID?: string
    nameIDFormat?: string
    [key: string]: unknown
  }

  export class SAML {
    constructor(options: SamlOptions)
    getAuthorizeUrlAsync(relayState: string, host: string, options: Record<string, unknown>): Promise<string>
    validatePostResponseAsync(body: Record<string, string>): Promise<{ profile: SamlProfile | null; loggedOut: boolean }>
  }
}
