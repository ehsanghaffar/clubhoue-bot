interface Locale { languages?: string, locale?: string, acceptLanguages?: string }
interface Application {
  apiRoot?: string
  userAgent?: string
  userAgentStatic?: string
  appVersion?: string
  appBuild?: string
  agoraKey?: string
  pubnubRoot?: string
  pubnubPubKey?: string
  pubnubSubKey?: string
  pubnubSDK?: string
  acceptEncodings?: string
}

interface Debug {
  success?: boolean
  isVerified?: boolean
  auth_token?: string
  refresh_token?: string
  access_token?: string
  is_onboarding?: boolean
}

interface Tokens {
  access?: string
  refresh?: string
  auth?: string
}

type Profile = Application & Locale & {
  token?: string
  userId?: string
  deviceId?: string
  fetchOptions?: any
  verified?: boolean
  user?: {
    user_id?: string
    name?: string
    photo_url?: string
    username?: string
  }
}

export declare const application: { lastVersion: Application }
export declare const locales: { English: Locale, Korean: Locale }
